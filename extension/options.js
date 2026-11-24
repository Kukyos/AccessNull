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
