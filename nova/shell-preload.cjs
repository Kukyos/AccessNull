// The voice line's only door to the main process.
const { contextBridge, ipcRenderer } = require('electron');
const CHANNELS = ['tabs', 'brain', 'caption', 'play', 'hush', 'mic', 'view', 'open-sheet', 'focus-address', 'storage-changed'];
contextBridge.exposeInMainWorld('nova', {
  send: (type, data = {}) => ipcRenderer.send('shell', { type, ...data }),
  pcm: buf => ipcRenderer.send('pcm', buf),
  utteranceEnd: () => ipcRenderer.send('utterance-end'),
  played: id => ipcRenderer.send('played', id),
  wantView: () => ipcRenderer.send('want-view'),
  get: (area, keys) => ipcRenderer.invoke('storage-get', area, keys),
  set: (area, obj) => ipcRenderer.invoke('storage-set', area, obj),
  on: (ch, f) => CHANNELS.includes(ch) && ipcRenderer.on(ch, (_e, ...a) => f(...a)),
});
