// Every web page in AccessNull gets Nova's eyes and hands: the extension's content.js, unchanged,
// running in this isolated world with a tiny `chrome` that talks to the main process.
const { ipcRenderer } = require('electron');
const path = require('node:path');

globalThis.__NOVA__ = true; // content.js leaves the pill and the microphone to the browser itself
const onMessage = [], onStorage = [];
globalThis.chrome = {
  runtime: {
    sendMessage: msg => ipcRenderer.invoke('to-brain', msg),
    onMessage: { addListener: f => onMessage.push(f) },
  },
  storage: {
    local: { get: keys => ipcRenderer.invoke('storage-get', 'local', keys) },
    onChanged: { addListener: f => onStorage.push(f) },
  },
};
ipcRenderer.on('to-page', (_e, { rid, msg }) => {
  let done = false;
  const reply = v => { if (!done) { done = true; ipcRenderer.send('page-reply', { rid, reply: v === undefined ? null : JSON.parse(JSON.stringify(v)) }); } };
  for (const f of onMessage) f(msg, {}, reply);
});
ipcRenderer.on('storage-changed', (_e, changes, area) => {
  for (const f of onStorage) f(changes, area);
  // a saved look for this site changed: apply it straight away
  const v = changes.views?.newValue?.[location.hostname];
  if (v) window.__accessnull?.applyView(v);
});

const load = () => require(path.join(__dirname, '..', 'extension', 'content.js'));
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', load, { once: true });
else load();
