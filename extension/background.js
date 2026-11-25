// AccessNull — the brain (Nova, the assistant). Lives in the service worker so a task survives page loads with no UI open.
// Pages show a small glass pill (content.js); voice plays from an offscreen document (offscreen.js).
import { run, activeTab, send, settle, matchLabel, needsConfirm, isEcho, look, goalLang, STOP } from './agent.js';

const LANGS = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'te-IN': 'Telugu' };
// JS \b only knows ASCII letters, so Indian-script words sit outside it
const YES = /\b(yes|yeah|yep|yup|sure|go ahead|go for it|do it|okay|ok|confirm|proceed|haan|ha|aamaam|houdu)\b|हाँ|हां|जी|ठीक है|यस|ओके|ஆமாம்|சரி|ಹೌದು|ಸರಿ|అవును|సరే/i;
const NO = /\b(no|nope|not yet|not now|hold on|later|don'?t|cancel|wait|nahi|nahin|illa|beda)\b|नहीं|नही|मत|रुको|नो|இல்லை|வேண்டாம்|ಇಲ್ಲ|ಬೇಡ|లేదు|వద్దు/i;
// "talk to me in Hindi" / "हिंदी में बात करो": each language's name as people say it, in either script
const LANG_NAMES = { 'en-IN': /english|इंग्लिश|अंग्रेज़ी|अंग्रेजी|ஆங்கில|ಇಂಗ್ಲಿಷ್|ఇంగ్లీష్/i, 'hi-IN': /hindi|हिंदी|हिन्दी/i, 'ta-IN': /tamil|தமிழ்/i, 'kn-IN': /kannada|ಕನ್ನಡ/i, 'te-IN': /telugu|తెలుగు/i };
const SWITCHED = { 'en-IN': "Okay, I'll speak English now.", 'hi-IN': 'ठीक है, अब मैं हिंदी में बात करूँगी।', 'ta-IN': 'சரி, இனி தமிழில் பேசுகிறேன்.', 'kn-IN': 'ಸರಿ, ಇನ್ನು ಮುಂದೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.', 'te-IN': 'సరే, ఇకపై తెలుగులో మాట్లాడతాను.' };

let running = false, abort = false, speaking = 0, numbersOn = false;
let lastSaid = '', lastSpokeAt = 0; // echo guard: the mic hears our own voice
let pending = null; // { kind: 'confirm'|'ask', resolve }
let ui = { state: 'idle', text: '' }; // what the pill shows; re-sent to every page that loads mid-task
let taskTab = null;

// ---------- settings: keys.local.json (git-ignored) as defaults, options page overrides ----------
export async function getSettings() {
  const file = await fetch(chrome.runtime.getURL('keys.local.json')).then(r => r.json()).catch(() => ({}));
  const saved = await chrome.storage.local.get(null);
  delete saved.transcript;
  for (const k in saved) if (saved[k] === '') delete saved[k];
  const { confirm } = await chrome.storage.session.get('confirm'); // "just do what I say" lasts until the browser closes
  const s = { ...file, ...saved, confirm: confirm || 'on' };
  if (s.tier === 'smart') s.model = s.smartModel || 'anthropic/claude-sonnet-5';
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
  chrome.runtime.sendMessage({ type: 'ui', ui }).catch(() => {}); // Nova's home page is an extension page, not a content script
}

// timestamps of everything shown/spoken, read back by the demo recorder
// in-memory buffer: a get-then-set per entry raced and dropped lines written close together
let traceBuf = [];
const transcript = chrome.storage.local.get('transcript').then(r => r.transcript || []);
function trace(kind, data) {
  const e = { t: Date.now() / 1000, kind, ...data };
  traceBuf.push(e);
  traceBuf = traceBuf.slice(-400);
  chrome.storage.session.set({ trace: traceBuf });
  // the lasting transcript (settings page -> download): what was heard, said and planned, not pill redraws
  if (kind !== 'ui') transcript.then(a => { a.push(e); a.splice(0, a.length - 3000); chrome.storage.local.set({ transcript: a }); });
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
  inbox: [], // what the user says while a task runs; the planner sees it next step
  set: setSetting,
};

// ---------- settings by voice: "speak Tamil", "just do what I say", "use a smarter model" ----------
async function setSetting(key, value) {
  const v = String(value ?? '').toLowerCase().trim();
  let msg;
  if (key === 'lang') {
    const lang = LANGS[value] ? value : Object.keys(LANG_NAMES).find(k => LANG_NAMES[k].test(v));
    if (!lang) msg = `I can speak ${Object.values(LANGS).join(', ')}.`;
    else await chrome.storage.local.set({ lang }), (msg = SWITCHED[lang]);
  } else if (key === 'confirm') {
    const off = /off|no|false|disable/.test(v);
    await chrome.storage.session.set({ confirm: off ? 'off' : 'on' });
    msg = off ? "Okay, I won't ask before acting. I still never type passwords." : "Okay, I'll ask before anything that can't be undone.";
  } else if (key === 'narrate') {
    const off = /off|no|false|quiet|disable/.test(v);
    await chrome.storage.local.set({ narrate: off ? 'off' : 'on' });
    msg = off ? "Okay, I'll work quietly and only speak when I have the answer." : "Okay, I'll tell you what I'm doing as I go.";
  } else if (key === 'model') {
    const tier = /smart|best|sonnet|better|power/.test(v) ? 'smart' : 'cheap';
    await chrome.storage.local.set({ tier });
    msg = tier === 'smart' ? 'Okay, using the smarter model. It costs a bit more.' : 'Okay, using the faster, cheaper model.';
  } else if (key === 'rate') {
    const cur = (await getSettings()).rate;
    const rate = Math.min(1.6, Math.max(0.7, /fast|quick/.test(v) ? cur + 0.2 : /slow/.test(v) ? cur - 0.2 : +v || 1));
    await chrome.storage.local.set({ rate: String(rate) });
    msg = rate > cur ? "Okay, I'll speak faster." : rate < cur ? "Okay, I'll speak slower." : 'Okay.';
  } else msg = `I can't change ${key}.`;
  trace('set', { text: `${key}=${v}` });
  return { msg, settings: await getSettings() };
}
// the common phrasings answered instantly; anything else reaches the planner's "set" action
const SETTING_CMDS = [
  [/^(just do (it|what i say)|(disable|turn off|remove) (the )?(guardrails|confirmations?|safety)|stop asking|don'?t ask( me)?)\b/, 'confirm', 'off'],
  [/^((enable|turn on) (the )?(guardrails|confirmations?|safety)|ask (me )?(first|before))\b/, 'confirm', 'on'],
  [/^(stop (screen )?(reading|narrating|talking so much)|be quiet|work quietly|less talking|don'?t narrate)\b/, 'narrate', 'off'],
  [/^(start narrating|tell me what you'?re doing|narrate( again)?|keep me posted)\b/, 'narrate', 'on'],
  [/\b(use|switch to) (a |the )?(cheaper|faster|cheap|fast) model\b/, 'model', 'cheap'],
  [/\b(use|switch to) (a |the )?(smarter|better|best|smart|stronger) model\b/, 'model', 'smart'],
  [/^(speak|talk) (faster|quicker)\b/, 'rate', 'faster'],
  [/^(speak|talk) (slower|more slowly)\b/, 'rate', 'slower'],
];
// phrases can carry two settings: "stop screen reading and just do what I say"
const CLAUSES = t => t.split(/,|\band\b|\balso\b/).map(x => x.trim()).filter(Boolean);
async function voiceSetting(t) {
  const hits = [];
  for (const c of CLAUSES(t)) for (const [re, key, value] of SETTING_CMDS) if (re.test(c)) hits.push([key, value]);
  if (!hits.length) return false;
  const msgs = [];
  for (const [key, value] of hits) msgs.push((await setSetting(key, value)).msg);
  show('done', msgs.join(' '));
  speak(msgs.join(' '));
  return true;
}
function answer(value) {
  const p = pending;
  pending = null;
  p?.resolve(value);
}

// ---------- what the user said ----------
async function heard(text) {
  text = text.replace(/^\s*(hey|hi|ok|okay|hello)?[\s,]*nova\b[\s,.!]*/i, '') || text; // "Hey Nova, ..." — her name is optional
  const t = text.toLowerCase().replace(/[.!?,;:]+$/, '').trim(); // some recognisers add punctuation
  if (!t) return;
  trace('heard', { text });
  if (!pending && (await voiceSetting(t))) return; // before stop: "stop narrating" is a setting, not a stop
  if (STOP.test(t) && (running || speaking || reading?.token)) return stopAll();
  if (isEcho(t, lastSaid, speaking > 0, Date.now() - lastSpokeAt, pending?.kind === 'confirm')) return trace('echo', { text });

  if (pending?.kind === 'confirm') {
    if (NO.test(t)) return answer(false);
    if (YES.test(t)) return answer(true);
    return io.say('Please say yes or no.');
  }
  if (pending?.kind === 'ask') return show('working', text), answer(text);
  if (running) {
    // questions about the screen are answered alongside the task; anything else steers it
    if (DESCRIBE.test(t)) return describe();
    if (/^(what are you doing|where are you|what'?s happening|status)/.test(t)) return speak(ui.text || "I'm working on it.");
    io.inbox.push(text);
    return speak('Got it.');
  }

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
  // language switch: "speak Hindi", "talk to me in Tamil", "हिंदी में बात करो". Whole short phrase only, so "search Tamil talk shows" stays a task
  const en = t.match(/^(?:please |can you |now )?(?:speak|talk|reply|answer|switch)(?: to me| with me)?(?: in| to)? (\S+)(?: language)?(?: please| now| from now on)?$/);
  const indic = t.split(/\s+/).length <= 5 && /बात|बोल|பேசு|ಮಾತನಾಡ|మాట్లాడ/.test(t);
  if (en || indic) {
    const lang = Object.keys(LANG_NAMES).find(k => LANG_NAMES[k].test(en ? en[1] : t));
    if (lang) {
      await chrome.storage.local.set({ lang }); // the page's recogniser restarts in the new language (content.js)
      return reply(SWITCHED[lang]);
    }
  }
  // describe what's on screen (photos, charts, pages with no text): the vision model, no planner step
  if (DESCRIBE.test(t)) return describe(), true;
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

const DESCRIBE = /^(describe|read the screen|what('?s| is) (in |on )?(the |this |my )?(screen|page|picture|image|photo)|what do you see|what am i looking at|स्क्रीन पर क्या|यह क्या है)/;
async function describe() {
  const tab = await activeTab();
  if (!running) show('working', 'Looking…');
  const settings = await getSettings();
  try {
    const text = await look({ settings, windowId: tab.windowId, prompt: `Describe this screen for someone who is blind, in under 70 words, as a friend would. If there is a main photo or image, describe it first: who or what is in it, colours, mood, any text in it. Then say what the page is and what can be done here. Reply in ${settings.langName}.` });
    if (!running) show('done', text);
    return speak(text);
  } catch {
    return speak("Sorry, I couldn't see the screen just now.");
  }
}

async function startTask(goal) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    chrome.runtime.openOptionsPage();
    return io.say("Add an AI API key in Nova's settings first.");
  }
  running = true;
  abort = false;
  io.inbox = [];
  // answer in the language of this request: Indian scripts, or Hinglish typed by the English recogniser
  const spoken = goalLang(goal);
  if (spoken) settings.langName = spoken;
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
  chrome.runtime.sendMessage({ type: 'listen', on, ui }).catch(() => {});
  if (on && !running) speak((await getSettings()).greeting || "Hi, I'm Nova. I'm listening.");
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
  else if (msg.type === 'toggle') toggle();
  else if (msg.type === 'hello') {
    // a page just loaded: should it show the pill, and in what state?
    chrome.storage.session.get('listening').then(({ listening }) =>
      reply({ listening: !!listening, ui: running || pending || ui.state === 'done' ? ui : { state: 'idle', text: '' } }));
    return true;
  }
});

// reachable only from the extension's own worker (DevTools, the demo recorder), never from web pages
self.__accessnull = { heard, setListening, stopAll, busy: () => speaking > 0 || Date.now() - lastSpokeAt < 1500, state: () => ({ running, pending: pending?.kind, ui }) };
