// AccessNull settings. Values saved here override keys.local.json.
const form = document.getElementById('settingsForm');
const saved = await chrome.storage.local.get(null);
for (const el of form.elements) if (el.name && saved[el.name] != null) el.value = saved[el.name];
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  for (const k in data) data[k] = data[k].trim();
  await chrome.storage.local.set(data);
  document.getElementById('saved').textContent = 'Saved.';
  setTimeout(() => (document.getElementById('saved').textContent = ''), 1500);
});

// transcript: one line per thing heard / said / planned, newest last
const LABEL = { heard: 'YOU  ', say: 'SAID ', task: 'TASK ', echo: 'echo ', set: 'SET  ', end: '---- ' };
const fmt = e => `${new Date(e.t * 1000).toLocaleTimeString()}  ${LABEL[e.kind] || (e.level || e.kind).padEnd(5).slice(0, 5)}  ${e.text || e.goal || ''}`;
async function showLog() {
  const { transcript = [] } = await chrome.storage.local.get('transcript');
  const log = document.getElementById('log');
  log.textContent = transcript.map(fmt).join('\n') || 'Nothing yet.';
  log.scrollTop = log.scrollHeight;
  return transcript;
}
showLog();
chrome.storage.onChanged.addListener(c => c.transcript && showLog());
document.getElementById('dl').onclick = async () => {
  const text = (await showLog()).map(fmt).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: `accessnull-transcript-${new Date().toISOString().slice(0, 16).replace(':', '')}.txt` });
  a.click();
};
document.getElementById('clear').onclick = () => chrome.storage.local.set({ transcript: [] });
