// AccessNull — side panel: voice routing, confirmation gate UI, live log, settings.
import { run, activeTab, send, settle, matchLabel, needsConfirm } from './agent.js';
import { speak, hush, speaking, listener } from './voice.js';

const $ = id => document.getElementById(id);
const LANGS = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'te-IN': 'Telugu' };

let settings = {};
let running = false;
let abort = false;
let pending = null; // { kind: 'confirm'|'ask', resolve }
let numbersOn = false;

// ---------- settings ----------
async function loadSettings() {
  settings = await chrome.storage.local.get(null);
  settings.lang ||= 'en-IN';
  settings.langName = LANGS[settings.lang];
  settings.rate = +settings.rate || 1;
  for (const el of $('settingsForm').elements) if (el.name && settings[el.name] != null) el.value = settings[el.name];
  if (!settings.groqKey) $('settings').open = true;
}
$('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  for (const k in data) data[k] = data[k].trim();
  await chrome.storage.local.set(data);
  await loadSettings();
  $('saved').textContent = 'Saved.';
  setTimeout(() => ($('saved').textContent = ''), 1500);
});

// ---------- log ----------
function log(kind, text) {
  if (!text) return;
  const li = document.createElement('li');
  li.className = kind;
  li.textContent = text;
  $('log').prepend(li);
  while ($('log').children.length > 60) $('log').lastChild.remove();
}
function say(text, { wait } = {}) {
  log('say', text);
  const p = speak(text, settings);
  return wait ? p : undefined;
}

// ---------- confirm / ask: answered by voice or by buttons/typing ----------
async function confirm(question) {
  $('confirmQ').textContent = question;
  $('confirm').hidden = false;
  $('yes').focus();
  await say(question, { wait: true });
  const ok = await new Promise(resolve => (pending = { kind: 'confirm', resolve }));
  $('confirm').hidden = true;
  return ok;
}
async function ask(question) {
  await say(question, { wait: true });
  $('goal').placeholder = 'Type your answer…';
  const reply = await new Promise(resolve => (pending = { kind: 'ask', resolve }));
  $('goal').placeholder = 'Or type: find the cheapest steel bottle…';
  return reply;
}
function settle_(value) {
  const p = pending;
  pending = null;
  p?.resolve(value);
}
$('yes').onclick = () => settle_(true);
$('no').onclick = () => settle_(false);

const YES = /\b(yes|yeah|yep|yup|sure|go ahead|do it|okay|ok|confirm|proceed|haan|ha|aamaam|houdu)\b/i;
const NO = /\b(no|nope|don'?t|cancel|wait|nahi|nahin|illa|beda)\b/i;

// ---------- routing what the user said ----------
async function route(text) {
  const t = text.toLowerCase().trim();
  if (!t) return;
  if (/^(stop|cancel|abort|quiet|shut up|ruko|bas)\b/.test(t) && (running || speaking)) return stopAll();

  if (pending?.kind === 'confirm') {
    if (NO.test(t)) return settle_(false);
    if (YES.test(t)) return settle_(true);
    return say('Please say yes or no.');
  }
  if (pending?.kind === 'ask') {
    log('you', text);
    return settle_(text);
  }
  if (running) return say('I am still working. Say stop to cancel.');

  log('you', text);
  if (await quick(t)) return;
  startTask(text);
}

// Instant commands, no AI round trip.
async function quick(t) {
  const tab = await activeTab();
  const click = t.match(/^(?:click|press|tap|open)\s+(?:number\s+)?(\d+)$/);
  if (click) {
    const r = await send(tab.id, { type: 'label', i: +click[1] });
    if (!r?.label) return say(`There is no number ${click[1]}.`), true;
    await send(tab.id, { type: 'act', action: { type: 'click', i: +click[1] } });
    say(`Clicked ${r.label}.`);
    await settle(tab.id);
    if (numbersOn) await send(tab.id, { type: 'snapshot', marks: true });
    return true;
  }
  const scroll = t.match(/^scroll (up|down|to the top|to the bottom)$/);
  if (scroll) {
    const dir = { 'to the top': 'top', 'to the bottom': 'bottom' }[scroll[1]] || scroll[1];
    await send(tab.id, { type: 'act', action: { type: 'scroll', dir } });
    if (numbersOn) await send(tab.id, { type: 'snapshot', marks: true });
    return true;
  }
  if (/^go back$/.test(t)) return chrome.tabs.goBack(tab.id), true;
  // "click sign in": matched locally, no AI call. Unmatched commands fall through to the agent.
  const named = t.match(/^(?:click|press|tap|open|select|choose)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/);
  if (named) {
    const snap = await send(tab.id, { type: 'snapshot', marks: numbersOn });
    const el = matchLabel(named[1], snap.elements);
    if (!el) {
      if (settings.groqKey) return false;
      return say(`I couldn't find ${named[1]} on this page.`), true;
    }
    if (needsConfirm({ type: 'click' }, el) && !(await confirm(`Clicking \"${el.label}\" may not be undoable. Should I go ahead?`))) return say('Okay, not doing that.'), true;
    await send(tab.id, { type: 'act', action: { type: 'click', i: el.i } });
    say(`Clicked ${el.label}.`);
    return true;
  }
  if (/^(show|hide) (the )?numbers$/.test(t)) return toggleNumbers(t.startsWith('show')), true;
  return false;
}

async function toggleNumbers(on = !numbersOn) {
  numbersOn = on;
  $('numbers').textContent = on ? 'Hide numbers' : 'Show numbers';
  const tab = await activeTab();
  await send(tab.id, on ? { type: 'snapshot', marks: true } : { type: 'clearMarks' }).catch(() => {});
}
$('numbers').onclick = () => toggleNumbers();

async function startTask(goal) {
  if (!settings.groqKey) {
    $('settings').open = true;
    return say('Add your Groq API key in settings first.');
  }
  running = true;
  abort = false;
  $('stop').hidden = false;
  try {
    await run(goal, settings, { say, confirm, ask, log, aborted: () => abort });
  } catch (e) {
    log('error', String(e.message || e));
    say('Something went wrong. Please try again.');
  } finally {
    running = false;
    $('stop').hidden = true;
  }
}

function stopAll() {
  abort = true;
  hush();
  if (pending) settle_(pending.kind === 'confirm' ? false : 'stop');
  log('stop', 'Stopped.');
}
$('stop').onclick = stopAll;

$('goalForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('goal').value.trim();
  $('goal').value = '';
  if (text) route(text);
});

// ---------- mic ----------
const mic = listener({
  lang: () => settings.lang,
  onText(text, final) {
    // ignore our own voice coming back through the mic, except "stop"
    if (speaking && !/\b(stop|ruko|bas)\b/i.test(text)) return;
    $('heard').textContent = final ? `“${text}”` : `${text}…`;
    if (final) route(text);
  },
  onState(on) {
    $('mic').setAttribute('aria-pressed', on);
    $('micLabel').textContent = on ? 'Listening… (click to stop)' : 'Start listening';
  },
  onDenied() {
    say('I need microphone access. A tab will open: please click Allow.');
    chrome.tabs.create({ url: chrome.runtime.getURL('mic.html') });
  },
});
$('mic').onclick = () => (mic.on ? mic.stop() : mic.start());
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'toggle-listen') mic.on ? mic.stop() : mic.start();
  if (msg.type === 'mic-granted') mic.start();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') stopAll();
});

await loadSettings();
