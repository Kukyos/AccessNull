// AccessNull — the brain. Lives in the service worker so a task survives page loads with no UI open.
// Pages show a small glass pill (content.js); voice plays from an offscreen document (offscreen.js).
import { run, activeTab, send, settle, matchLabel, needsConfirm, isEcho, STOP } from './agent.js';

const LANGS = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'te-IN': 'Telugu' };
const YES = /\b(yes|yeah|yep|yup|sure|go ahead|go for it|do it|okay|ok|confirm|proceed|haan|ha|aamaam|houdu)\b/i;
const NO = /\b(no|nope|not yet|not now|hold on|later|don'?t|cancel|wait|nahi|nahin|illa|beda)\b/i;

let running = false, abort = false, speaking = 0, numbersOn = false;
let lastSaid = '', lastSpokeAt = 0; // echo guard: the mic hears our own voice
let pending = null; // { kind: 'confirm'|'ask', resolve }
let ui = { state: 'idle', text: '' }; // what the pill shows; re-sent to every page that loads mid-task
let taskTab = null;

// ---------- settings: keys.local.json (git-ignored) as defaults, options page overrides ----------
export async function getSettings() {
  const file = await fetch(chrome.runtime.getURL('keys.local.json')).then(r => r.json()).catch(() => ({}));
  const saved = await chrome.storage.local.get(null);
  for (const k in saved) if (saved[k] === '') delete saved[k];
  const s = { ...file, ...saved };
  s.lang ||= 'en-IN';
  s.langName = LANGS[s.lang];
  s.rate = +s.rate || 1;
  return s;
}

// ---------- pill ----------
async function show(state, text = '', extra = {}) {
  ui = { state, text, ...extra };
  trace('ui', ui);
  const tab = taskTab ?? (await activeTab())?.id;
  if (tab != null) chrome.tabs.sendMessage(tab, { type: 'ui', ui }).catch(() => {});
}

// timestamps of everything shown/spoken, read back by the demo recorder
function trace(kind, data) {
  chrome.storage.session.get('trace').then(({ trace = [] }) => {
    trace.push({ t: Date.now() / 1000, kind, ...data });
    chrome.storage.session.set({ trace: trace.slice(-400) });
  });
}

// ---------- voice out, via the offscreen document (service workers can't play audio) ----------
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Speak to the user' }).catch(() => {});
}
async function speak(text, { wait } = {}) {
  if (!text) return;
  trace('say', { text });
  await ensureOffscreen();
  const settings = await getSettings();
  speaking++;
  lastSaid = text.toLowerCase();
  const done = chrome.runtime.sendMessage({ target: 'offscreen', type: 'speak', text, settings })
    .catch(() => {}).finally(() => (speaking--, (lastSpokeAt = Date.now())));
  if (wait) await done;
}
async function hush() {
  if (await chrome.offscreen.hasDocument()) chrome.runtime.sendMessage({ target: 'offscreen', type: 'hush' }).catch(() => {});
}

// ---------- io for the agent loop ----------
const io = {
  say(text, opts) { show(running ? 'working' : 'done', text); return speak(text, opts); },
  log(kind, text) {
    trace('log', { level: kind, text });
    if (kind === 'think' && ui.state !== 'working') show('working', ui.text || 'Working on it…');
    if (kind === 'error' || kind === 'stop') show('done', text);
  },
  async confirm(question) {
    await show('confirm', question);
    await speak(question, { wait: true });
    const ok = await new Promise(resolve => (pending = { kind: 'confirm', resolve }));
    await show('working', ok ? 'On it.' : 'Okay, not doing that.');
    return ok;
  },
  async ask(question) {
    await show('ask', question);
    await speak(question, { wait: true });
    return new Promise(resolve => (pending = { kind: 'ask', resolve }));
  },
  aborted: () => abort,
};
function answer(value) {
  const p = pending;
  pending = null;
  p?.resolve(value);
}

// ---------- what the user said ----------
async function heard(text) {
  const t = text.toLowerCase().replace(/[.!?,;:]+$/, '').trim(); // some recognisers add punctuation
  if (!t) return;
  trace('heard', { text });
  if (STOP.test(t) && (running || speaking || reading?.token)) return stopAll();
  if (isEcho(t, lastSaid, speaking > 0, Date.now() - lastSpokeAt, pending?.kind === 'confirm')) return trace('echo', { text });

  if (pending?.kind === 'confirm') {
    if (NO.test(t)) return answer(false);
    if (YES.test(t)) return answer(true);
    return io.say('Please say yes or no.');
  }
  if (pending?.kind === 'ask') return show('working', text), answer(text);
  if (running) return io.say("I'm still on it. Say stop to cancel.");

  await show('heard', text);
  if (await quick(t)) return;
  startTask(text);
}

// ---------- read aloud ----------
const READ_CHUNK = 6; // paragraphs before pausing for "keep reading"
let reading = null; // { tab, list, next, token }
async function readAloud(resume = false) {
  const tab = (await activeTab())?.id;
  if (!resume || !reading || reading.tab !== tab) {
    const list = await send(tab, { type: 'readable' }).catch(() => []);
    if (!list?.length) return io.say("I couldn't find anything to read here.");
    reading = { tab, list, next: 0 };
  }
  const token = (reading.token = Symbol());
  const end = Math.min(reading.list.length, reading.next + READ_CHUNK);
  trace('read', { from: reading.next, to: end });
  for (; reading.next < end; reading.next++) {
    if (reading.token !== token) return; // stopped or restarted
    const b = reading.list[reading.next];
    await send(tab, { type: 'highlight', i: b.i }).catch(() => {});
    show('reading', b.text.length > 90 ? b.text.slice(0, 88) + '…' : b.text);
    await speak(b.text, { wait: true });
  }
  if (reading.token !== token) return;
  await send(tab, { type: 'highlight', i: -1 }).catch(() => {});
  if (reading.next < reading.list.length) {
    show('idle', 'Say “keep reading” to go on.');
    speak('Say keep reading to go on.');
  } else {
    show('done', 'That’s the end of this page.');
    speak("That's the end of this page.");
    reading = null;
  }
}
io.readAloud = () => readAloud(false);

// Instant commands: no AI round trip.
async function quick(t) {
  const tab = await activeTab();
  const reply = text => (show('done', text), speak(text), true);
  const num = t.match(/^(?:click|press|tap|open)\s+(?:number\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)$/);
  if (num) {
    const n = +num[1] || ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].indexOf(num[1]) + 1;
    const r = await send(tab.id, { type: 'label', i: n });
    if (!r?.label) return reply(`There's no number ${n}.`);
    await send(tab.id, { type: 'act', action: { type: 'click', i: n } });
    reply(`Clicked ${r.label}.`);
    await settle(tab.id);
    if (numbersOn) await send(tab.id, { type: 'snapshot', marks: true });
    return true;
  }
  const scroll = t.match(/^scroll (up|down|to the top|to the bottom)$/);
  if (scroll) {
    const dir = { 'to the top': 'top', 'to the bottom': 'bottom' }[scroll[1]] || scroll[1];
    await send(tab.id, { type: 'act', action: { type: 'scroll', dir } });
    if (numbersOn) await send(tab.id, { type: 'snapshot', marks: true });
    return show('idle'), true;
  }
  if (/^go back$/.test(t)) return chrome.tabs.goBack(tab.id), show('idle'), true;
  if (/^(read (it|this|this page|the page|it to me|this to me|to me)|start reading)$/.test(t)) return readAloud(false), true;
  if (/^(keep reading|continue reading|go on|continue|carry on)$/.test(t)) return readAloud(true), true;
  const nums = t.match(/^(show|hide) (the )?numbers$/);
  if (nums) {
    numbersOn = nums[1] === 'show';
    await send(tab.id, numbersOn ? { type: 'snapshot', marks: true } : { type: 'clearMarks' }).catch(() => {});
    return show('idle'), true;
  }
  // "click sign in": matched locally. Unmatched commands fall through to the agent.
  const named = t.match(/^(?:click|press|tap|select|choose)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/);
  if (named) {
    const snap = await send(tab.id, { type: 'snapshot', marks: numbersOn });
    const el = matchLabel(named[1], snap.elements);
    if (!el) return (await getSettings()).apiKey ? false : reply(`I couldn't find ${named[1]} here.`);
    if (needsConfirm({ type: 'click' }, el) && !(await io.confirm(`"${el.label}" may not be undoable. Should I go ahead?`))) return reply('Okay, not doing that.');
    await send(tab.id, { type: 'act', action: { type: 'click', i: el.i } });
    return reply(`Clicked ${el.label}.`);
  }
  return false;
}

async function startTask(goal) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    chrome.runtime.openOptionsPage();
    return io.say('Add an AI API key in AccessNull settings first.');
  }
  running = true;
  abort = false;
  settings.showMarks = numbersOn;
  taskTab = (await activeTab())?.id;
  // keep the worker alive through slow model calls and long confirmations
  const alive = setInterval(() => chrome.runtime.getPlatformInfo(), 20000);
  trace('task', { goal });
  try {
    await run(goal, settings, io);
  } catch (e) {
    io.log('error', 'Something went wrong. Please try again.');
    speak('Something went wrong. Please try again.');
    console.error(e);
  } finally {
    clearInterval(alive);
    running = false;
    taskTab = null;
    trace('end', {});
    if (ui.state === 'working') show('idle');
  }
}

function stopAll() {
  abort = true;
  if (reading) reading.token = null;
  hush();
  activeTab().then(t => t?.id != null && chrome.tabs.sendMessage(t.id, { type: 'clearMarks' }).catch(() => {}));
  if (pending) answer(pending.kind === 'confirm' ? false : 'stop');
  show('done', 'Stopped.');
}

// ---------- listening on/off (the pill shows on every page while on) ----------
async function setListening(on) {
  await chrome.storage.session.set({ listening: on });
  const tab = await activeTab();
  if (tab?.id != null) chrome.tabs.sendMessage(tab.id, { type: 'listen', on, ui }).catch(async () => {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
    chrome.tabs.sendMessage(tab.id, { type: 'listen', on, ui }).catch(() => {});
  });
  if (on && !running) speak((await getSettings()).greeting || "I'm listening.");
}
async function toggle() {
  const { listening } = await chrome.storage.session.get('listening');
  setListening(!listening);
}
chrome.action.onClicked.addListener(toggle);
chrome.commands.onCommand.addListener(cmd => cmd === 'toggle-listen' && toggle());

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.target === 'offscreen') return;
  if (msg.type === 'heard') heard(msg.text);
  else if (msg.type === 'confirm') answer(!!msg.ok);
  else if (msg.type === 'stop') stopAll();
  else if (msg.type === 'close') setListening(false);
  else if (msg.type === 'hello') {
    // a page just loaded: should it show the pill, and in what state?
    chrome.storage.session.get('listening').then(({ listening }) =>
      reply({ listening: !!listening, ui: running || pending || ui.state === 'done' ? ui : { state: 'idle', text: '' } }));
    return true;
  }
});

// reachable only from the extension's own worker (DevTools, the demo recorder), never from web pages
self.__accessnull = { heard, setListening, stopAll, busy: () => speaking > 0 || Date.now() - lastSpokeAt < 1500, state: () => ({ running, pending: pending?.kind, ui }) };
