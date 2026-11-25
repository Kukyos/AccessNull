// AccessNull: a browser built around Nova. Electron main process.
// Nova's brain is the same code as the extension (extension/background.js + agent.js); this file gives it a
// `chrome` it can talk to (tabs, storage, messaging, screenshots), her ears (Speko streaming speech-to-text)
// and her voice (ElevenLabs), and draws the window: Nova's voice line on top, the page below.
import { app, BaseWindow, WebContentsView, ipcMain, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import WebSocket from 'ws';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.join(HERE, '..', 'extension');
const START = pathToFileURL(path.join(HERE, 'start.html')).href;
const UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
app.userAgentFallback = UA; // sites (WhatsApp, Google) turn away browsers they don't recognise
app.setName('AccessNull');
// tests: feed a WAV file in as the microphone
if (process.env.NOVA_FAKE_MIC) {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-file-for-fake-audio-capture', process.env.NOVA_FAKE_MIC);
}

let win, shell, shellH = 150, sheetOpen = false;
const log = (...a) => process.env.NOVA_DEBUG && console.log('[nova]', ...a);

// ---------- storage: chrome.storage.local in a JSON file, session in memory ----------
const STORE = () => path.join(app.getPath('userData'), 'nova-storage.json');
const areas = { local: {}, session: {} };
const storageListeners = [];
function area(name) {
  const data = areas[name];
  return {
    async get(keys) {
      if (keys == null) return structuredClone(data);
      const ks = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of ks) if (k in data) out[k] = structuredClone(data[k]);
      return out;
    },
    async set(obj) {
      const changes = {};
      for (const [k, v] of Object.entries(obj)) { changes[k] = { oldValue: data[k], newValue: v }; data[k] = structuredClone(v); }
      if (name === 'local') persist();
      if ('transcript' in obj) transcriptToDisk(changes.transcript);
      for (const f of storageListeners) try { f(changes, name); } catch {}
      // pages (saved looks) and the voice line (settings) follow changes too, but not the big transcript
      const light = Object.fromEntries(Object.entries(changes).filter(([k]) => k !== 'transcript' && k !== 'trace'));
      if (Object.keys(light).length) for (const wc of [shell?.webContents, ...tabs.map(t => t.view.webContents)]) wc && !wc.isDestroyed() && wc.send('storage-changed', light, name);
    },
    async remove(keys) { for (const k of [].concat(keys)) delete data[k]; if (name === 'local') persist(); },
  };
}
let persistTimer;
function persist() { clearTimeout(persistTimer); persistTimer = setTimeout(() => fs.writeFileSync(STORE(), JSON.stringify(areas.local)), 300); }

// the transcript also lands on disk as plain text, one file per day, for debugging
let txWritten = 0;
function transcriptToDisk(change) {
  const all = change?.newValue || [];
  const fresh = all.filter(e => e.t > txWritten);
  if (!fresh.length) return;
  txWritten = fresh.at(-1).t;
  const dir = path.join(app.getPath('userData'), 'transcripts');
  fs.mkdirSync(dir, { recursive: true });
  const lines = fresh.map(e => `${new Date(e.t * 1000).toLocaleTimeString('en-IN', { hour12: false })}  ${(e.kind === 'log' ? e.level : e.kind).padEnd(6)} ${e.text || e.goal || ''}`);
  fs.appendFileSync(path.join(dir, `${new Date().toISOString().slice(0, 10)}.txt`), lines.join('\n') + '\n');
}

// ---------- tabs ----------
const tabs = [];
let activeId = null, nextId = 1;
const active = () => tabs.find(t => t.id === activeId);
const tabOf = wc => tabs.find(t => t.view.webContents === wc);
function info(t) {
  const wc = t.view.webContents;
  return { id: t.id, windowId: 1, active: t.id === activeId, url: wc.getURL() || t.pending || START, title: wc.getTitle(), status: wc.isLoading() ? 'loading' : 'complete', lastAccessed: t.seen,
    favicon: t.favicon, canBack: wc.navigationHistory.canGoBack(), canForward: wc.navigationHistory.canGoForward() };
}
function newTab(url = START) {
  const view = new WebContentsView({
    webPreferences: { preload: path.join(HERE, 'page-preload.cjs'), partition: 'persist:nova', contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  const t = { id: nextId++, view, seen: Date.now() };
  tabs.push(t);
  const wc = view.webContents;
  wc.setWindowOpenHandler(({ url }) => { wc.loadURL(url); return { action: 'deny' }; }); // no surprise windows: one journey, one tab
  for (const ev of ['did-start-loading', 'did-stop-loading', 'page-title-updated', 'did-navigate', 'did-navigate-in-page']) wc.on(ev, () => pushTabs());
  wc.on('page-favicon-updated', (_e, icons) => { t.favicon = icons[0]; pushTabs(); });
  wc.on('did-start-navigation', (_e, _u, inPage, main) => { if (main && !inPage) t.favicon = null; });
  wc.on('before-input-event', (e, input) => keys(e, input));
  win.contentView.addChildView(view);
  view.webContents.loadURL(url);
  select(t.id);
  return t;
}
function select(id) {
  activeId = id;
  const t = active();
  if (t) t.seen = Date.now();
  layout();
  pushTabs();
}
function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id);
  if (i < 0) return;
  const [t] = tabs.splice(i, 1);
  win.contentView.removeChildView(t.view);
  t.view.webContents.close();
  if (!tabs.length) newTab();
  else if (activeId === id) select(tabs[Math.max(0, i - 1)].id);
  else pushTabs();
}
function layout() {
  if (!win) return;
  const { width, height } = win.getContentBounds();
  const top = shellH;
  for (const t of tabs) {
    t.view.setVisible(t.id === activeId);
    t.view.setBounds({ x: 0, y: top, width, height: Math.max(0, height - top) });
  }
  // the voice line covers the whole window only while a sheet is open
  shell.setBounds({ x: 0, y: 0, width, height: sheetOpen ? height : top });
  win.contentView.addChildView(shell); // keep it on top
}
function pushTabs() {
  shell?.webContents.send('tabs', { tabs: tabs.map(info), activeId });
}

// ---------- page messaging: chrome.tabs.sendMessage → the page's content script (preload) ----------
let rid = 0;
const waiting = new Map();
ipcMain.on('page-reply', (_e, { rid, reply }) => { waiting.get(rid)?.(reply); waiting.delete(rid); });
function toPage(tabId, msg, ms = 6000) {
  const t = tabs.find(x => x.id === tabId);
  if (!t || t.view.webContents.isDestroyed()) return Promise.reject(new Error('no such tab'));
  return new Promise((resolve, reject) => {
    const id = ++rid;
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error('page did not answer')); }, ms);
    waiting.set(id, v => { clearTimeout(timer); resolve(v); });
    t.view.webContents.send('to-page', { rid: id, msg });
  });
}

// ---------- the brain's world: a `chrome` with just what background.js and agent.js use ----------
const brainListeners = [], commandListeners = [], clickListeners = [];
function toBrain(msg, sender = {}) {
  return new Promise(resolve => {
    let answered = false;
    const reply = v => { if (!answered) { answered = true; resolve(v); } };
    let async = false;
    for (const f of brainListeners) if (f(msg, sender, reply) === true) async = true;
    if (!async) reply(undefined);
  });
}
const event = list => ({ addListener: f => list.push(f) });
globalThis.self = globalThis;
globalThis.chrome = {
  runtime: {
    getURL: p => 'nova-ext:' + p,
    onMessage: event(brainListeners),
    getPlatformInfo: async () => ({ os: 'win' }),
    openOptionsPage: () => openSheet('settings'),
    async sendMessage(msg) {
      if (msg.target === 'offscreen') return msg.type === 'speak' ? speak(msg.text, msg.settings) : hush();
      if (msg.type === 'listen') ears.listen(msg.on);
      shell?.webContents.send('brain', msg); // 'ui' and 'listen' are for the voice line
    },
  },
  storage: { local: area('local'), session: area('session'), onChanged: event(storageListeners) },
  tabs: {
    async query(q = {}) { if (q.active) { const t = active(); return t ? [info(t)] : []; } return tabs.map(info); },
    async create({ url }) { return info(newTab(url)); },
    async remove(id) { closeTab(id); },
    async get(id) { const t = tabs.find(x => x.id === id); if (!t) throw new Error('no tab'); return info(t); },
    async update(id, { url, active: on }) { const t = tabs.find(x => x.id === id); if (on) select(id); if (url) { t.pending = url; t.view.webContents.loadURL(url).catch(() => {}); } return info(t); },
    async goBack(id) { tabs.find(x => x.id === id)?.view.webContents.navigationHistory.goBack(); },
    sendMessage: (id, msg) => toPage(id, msg),
    async captureVisibleTab() { return 'data:image/jpeg;base64,' + (await active().view.webContents.capturePage()).toJPEG(60).toString('base64'); },
  },
  scripting: { executeScript: async () => [] }, // the preload is in every page already
  offscreen: { hasDocument: async () => true, createDocument: async () => {} },
  action: { onClicked: event(clickListeners) },
  commands: { onCommand: event(commandListeners) },
};
// keys.local.json and friends are read with fetch(chrome.runtime.getURL(...)) by the brain
const netFetch = globalThis.fetch;
globalThis.fetch = (u, o) => String(u).startsWith('nova-ext:')
  ? Promise.resolve(new Response(fs.readFileSync(path.join(EXT, String(u).slice(9)))))
  : netFetch(u, o);

ipcMain.handle('to-brain', (e, msg) => toBrain(msg, { tab: tabOf(e.sender) && info(tabOf(e.sender)) }));
ipcMain.handle('storage-get', (_e, name, keys) => areas[name] && area(name).get(keys));
ipcMain.handle('storage-set', (_e, name, obj) => areas[name] && area(name).set(obj));

// ---------- voice out: ElevenLabs (key stays here), played by the voice line so the mic's echo cancelling hears it ----------
let voiceQueue = Promise.resolve(), playId = 0, hushed = 0;
const played = new Map();
ipcMain.on('played', (_e, id) => { played.get(id)?.(); played.delete(id); });
function speak(text, settings = {}) {
  const gen = hushed;
  voiceQueue = voiceQueue.then(async () => {
    if (gen !== hushed || !text) return;
    let audio = null;
    if (settings.elevenKey) {
      try {
        const res = await netFetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId || 'EXAVITQu4vr4xnSDxMaL'}?output_format=mp3_44100_128`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': settings.elevenKey },
          body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
        });
        if (res.ok) audio = Buffer.from(await res.arrayBuffer());
        else log('elevenlabs', res.status);
      } catch (e) { log('elevenlabs', e.message); }
    }
    if (gen !== hushed) return;
    const id = ++playId;
    await new Promise(resolve => {
      played.set(id, resolve);
      shell.webContents.send('play', { id, audio, text, rate: settings.rate || 1, lang: settings.lang || 'en-IN' });
      setTimeout(resolve, 60000);
    });
  }).catch(() => {});
  return voiceQueue;
}
function hush() {
  hushed++;
  shell?.webContents.send('hush');
  for (const r of played.values()) r();
  played.clear();
}

// ---------- ears: Speko streaming speech-to-text, one socket kept open while listening ----------
const SPEKO_LANG = { 'en-IN': 'en', 'hi-IN': 'hi', 'ta-IN': 'ta', 'kn-IN': 'kn', 'te-IN': 'te' };
const ears = {
  on: false, ws: null, ready: false, lang: 'en', backlog: [],
  async key() { return (await (await globalThis.fetch('nova-ext:keys.local.json')).json()).spekoKey; },
  async listen(on) {
    this.on = on;
    shell?.webContents.send('mic', on);
    if (!on) return this.close();
    this.lang = SPEKO_LANG[(await area('local').get('lang')).lang || 'en-IN'] || 'en';
    this.open();
  },
  async open() {
    if (this.ws) return;
    const key = await this.key();
    if (!key) return shell.webContents.send('caption', { kind: 'error', text: 'Add a Speko key to hear you.' });
    const ws = (this.ws = new WebSocket('wss://router.speko.dev/v1/stt/stream', { headers: { Authorization: `Bearer ${key}`, 'Idempotency-Key': `nova-${Date.now()}-${Math.random().toString(36).slice(2)}` } }));
    this.ready = false;
    ws.on('open', () => ws.send(JSON.stringify({
      type: 'session.configure',
      routing: this.lang === 'en' ? { mode: 'explicit', model: 'soniox/stt-rt-v6' } : { mode: 'auto', objective: 'latency' },
      audio: { encoding: 'pcm_s16le', sample_rate_hz: 16000, channels: 1 }, language: this.lang,
    })));
    ws.on('message', (d, bin) => {
      if (bin) return;
      const m = JSON.parse(d);
      if (m.type !== 'usage.updated') log('ears <-', m.type, (m.text || '').slice(0, 80));
      if (m.type === 'session.ready') { this.ready = true; log('ears ready', JSON.stringify(m.route)); for (const b of this.backlog.splice(0)) ws.send(b); }
      else if (m.type === 'transcript.delta') { this.partial = (this.partial || '') + ' ' + m.text; shell.webContents.send('caption', { kind: 'partial', text: this.heardSoFar(m.text) }); }
      else if (m.type === 'transcript.final') this.final(m.text);
      else if (m.type === 'error') log('ears error', JSON.stringify(m).slice(0, 200));
    });
    ws.on('close', () => { this.ws = null; this.ready = false; if (this.on) setTimeout(() => this.on && this.open(), 400); }); // leases expire: reconnect
    ws.on('error', e => log('ears socket', e.message));
  },
  // providers send finals in pieces; one utterance = everything final until the voice line says the user stopped
  utter: '', heardSoFar(delta) { return (this.utter + ' ' + delta).trim(); },
  final(text) {
    if (text?.trim()) this.utter = (this.utter + ' ' + text.trim()).trim();
    shell.webContents.send('caption', { kind: 'partial', text: this.utter });
    if (this.committed && this.utter) this.flush();
  },
  flush() {
    const text = this.utter.trim();
    this.utter = ''; this.committed = false; this.partial = '';
    clearTimeout(this.flushTimer);
    if (!text) return;
    shell.webContents.send('caption', { kind: 'heard', text });
    toBrain({ type: 'heard', text });
  },
  close() { const ws = this.ws; this.ws = null; try { ws?.send(JSON.stringify({ type: 'session.close' })); ws?.close(); } catch {} },
};
ipcMain.on('pcm', (_e, buf) => {
  if (!ears.on) return;
  const b = Buffer.from(buf);
  if (ears.ready && ears.ws?.readyState === 1) ears.ws.send(b);
  else { ears.backlog.push(b); ears.backlog.splice(0, ears.backlog.length - 40); if (!ears.ws) ears.open(); }
});
// the voice line heard the user stop talking: ask for the final words, hand them to the brain
ipcMain.on('utterance-end', () => {
  log('utterance end');
  if (!ears.ws || ears.ws.readyState !== 1) return;
  ears.committed = true;
  ears.ws.send(JSON.stringify({ type: 'input.commit' }));
  clearTimeout(ears.flushTimer);
  ears.flushTimer = setTimeout(() => ears.flush(), 1200); // a commit always gets a final; this is only a safety net
});
storageListeners.push(c => { if (c.lang && ears.on) { ears.close(); ears.listen(true); } });

// ---------- the voice line asks for things ----------
ipcMain.on('shell', async (_e, m) => {
  const t = active();
  if (m.type === 'navigate') {
    const q = m.text.trim();
    // an address goes straight there; anything else is a request for Nova
    if (/^(https?:\/\/|www\.)|^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q)) t.view.webContents.loadURL(/^https?:/.test(q) ? q : 'https://' + q);
    else toBrain({ type: 'heard', text: q });
  }
  else if (m.type === 'say') toBrain({ type: 'heard', text: m.text });
  else if (m.type === 'back') t?.view.webContents.navigationHistory.goBack();
  else if (m.type === 'forward') t?.view.webContents.navigationHistory.goForward();
  else if (m.type === 'reload') t?.view.webContents.reload();
  else if (m.type === 'home') t?.view.webContents.loadURL(START);
  else if (m.type === 'newTab') newTab();
  else if (m.type === 'select') select(m.id);
  else if (m.type === 'close') closeTab(m.id);
  else if (m.type === 'toggle') commandListeners.forEach(f => f('toggle-listen'));
  else if (m.type === 'stop') toBrain({ type: 'stop' });
  else if (m.type === 'confirm') toBrain({ type: 'confirm', ok: m.ok });
  else if (m.type === 'height') { shellH = m.h; layout(); }
  else if (m.type === 'sheet') { sheetOpen = m.open; layout(); }
  else if (m.type === 'look') {
    const { remodel } = await import(pathToFileURL(path.join(EXT, 'agent.js')).href);
    const settings = await getSettings();
    const r = await remodel(t.id, settings, m.view).catch(e => ({ say: "That page can't be changed." }));
    shell.webContents.send('caption', { kind: 'nova', text: r.say });
    pushView();
  }
});
async function pushView() {
  const t = active();
  const cur = await toPage(t.id, { type: 'applyView', view: null }, 3000).catch(() => null);
  const { views = {} } = await area('local').get('views');
  let host = '';
  try { host = new URL(t.view.webContents.getURL()).hostname; } catch {}
  shell.webContents.send('view', { host, view: cur, saved: !!views[host] });
}
ipcMain.on('want-view', pushView);
function openSheet(which) { shell?.webContents.send('open-sheet', which); }

// ---------- keys: Alt+Shift+A talk, Esc stop, Ctrl+L address, Ctrl+T/W tabs ----------
function keys(e, input) {
  if (input.type !== 'keyDown') return;
  const k = input.key.toLowerCase();
  if (input.alt && input.shift && k === 'a') { e.preventDefault(); commandListeners.forEach(f => f('toggle-listen')); }
  else if (input.control && k === 'l') { e.preventDefault(); shell.webContents.focus(); shell.webContents.send('focus-address'); }
  else if (input.control && k === 't') { e.preventDefault(); newTab(); }
  else if (input.control && k === 'w') { e.preventDefault(); closeTab(activeId); }
  else if (input.alt && k === 'arrowleft') { e.preventDefault(); active()?.view.webContents.navigationHistory.goBack(); }
  else if (k === 'f5') { e.preventDefault(); active()?.view.webContents.reload(); }
}

let getSettings;
app.whenReady().then(async () => {
  try { Object.assign(areas.local, JSON.parse(fs.readFileSync(STORE(), 'utf8'))); } catch {}
  for (const s of [session.defaultSession, session.fromPartition('persist:nova')]) {
    s.setUserAgent(UA);
    s.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'fullscreen', 'clipboard-sanitized-write', 'clipboard-read'].includes(perm)));
  }
  win = new BaseWindow({ width: 1440, height: 900, minWidth: 720, minHeight: 480, title: 'AccessNull', icon: path.join(HERE, 'icon.ico'),
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#F1F0F6', symbolColor: '#1C1B22', height: 40 }, backgroundColor: '#FBFBFD' });
  shell = new WebContentsView({ webPreferences: { preload: path.join(HERE, 'shell-preload.cjs'), contextIsolation: true, sandbox: true } });
  shell.setBackgroundColor('#00000000');
  shell.webContents.on('before-input-event', (e, input) => keys(e, input));
  shell.webContents.on('console-message', e => log('line:', e.message));
  win.contentView.addChildView(shell);
  await shell.webContents.loadFile(path.join(HERE, 'shell.html'));
  win.on('resize', layout);
  win.on('closed', () => app.quit());

  // Nova's brain: the extension's own service worker code, unchanged
  ({ getSettings } = await import(pathToFileURL(path.join(EXT, 'background.js')).href));
  newTab(process.argv.find(a => /^https?:\/\//.test(a)) || START);
  if (!process.env.NOVA_QUIET) setTimeout(() => commandListeners.forEach(f => f('toggle-listen')), 600);
});
app.on('window-all-closed', () => app.quit());

// test hooks (Playwright's Electron driver reaches main-process globals)
globalThis.__nova = {
  tabs: () => tabs.map(info),
  async shot(dir) {
    fs.writeFileSync(path.join(dir, 'line.png'), (await shell.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(dir, 'page.png'), (await active().view.webContents.capturePage()).toPNG());
  },
  heard: text => toBrain({ type: 'heard', text }),
  exec: js => active().view.webContents.executeJavaScript(js),
  userData: () => app.getPath('userData'),
};
