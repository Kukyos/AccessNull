// AccessNull home: Nova's dashboard. Same storage keys the voice commands change, so both stay in step.
const $ = id => document.getElementById(id);
const local = chrome.storage.local, session = chrome.storage.session;

async function load() {
  const s = await local.get(['lang', 'narrate', 'tier', 'rate']);
  const { confirm, listening } = await session.get(['confirm', 'listening']);
  $('lang').value = s.lang || 'en-IN';
  $('confirm').checked = confirm !== 'off';
  $('narrate').checked = s.narrate !== 'off';
  for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-checked', String(b.dataset.tier === (s.tier || 'cheap')));
  $('rate').value = s.rate || 1;
  $('rateVal').textContent = `${(+$('rate').value).toFixed(1)}×`;
  document.body.classList.toggle('on', !!listening);
  $('status').innerHTML = listening ? 'Listening. Say what you want done, or “stop”.' : 'Say what you want done. Press <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>A</kbd> or tap the orb.';
}

$('talk').onclick = () => chrome.runtime.sendMessage({ type: 'toggle' });
$('lang').onchange = e => local.set({ lang: e.target.value });
$('confirm').onchange = e => session.set({ confirm: e.target.checked ? 'on' : 'off' });
$('narrate').onchange = e => local.set({ narrate: e.target.checked ? 'on' : 'off' });
$('rate').oninput = e => local.set({ rate: e.target.value });
for (const b of document.querySelectorAll('.seg button')) b.onclick = () => local.set({ tier: b.dataset.tier });

// each task from the transcript: what was asked, how it ended
async function activity() {
  const { transcript = [] } = await local.get('transcript');
  const tasks = [];
  for (const e of transcript) {
    if (e.kind === 'task') tasks.push({ t: e.t, goal: e.goal, res: '' });
    else if (tasks.length && (e.kind === 'say' || (e.kind === 'log' && ['done', 'stop', 'error'].includes(e.level)))) tasks.at(-1).res = e.text;
  }
  const ol = $('activity');
  if (!tasks.length) return;
  ol.replaceChildren(...tasks.slice(-6).reverse().map(x => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="goal"></span><span class="res"></span><time></time>';
    li.querySelector('.goal').textContent = `“${x.goal}”`;
    li.querySelector('.res').textContent = x.res;
    li.querySelector('time').textContent = new Date(x.t * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return li;
  }));
}

const h = new Date().getHours();
$('hello').textContent = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}. I'm Nova.`;
load();
activity();
chrome.storage.onChanged.addListener(c => { load(); if (c.transcript) activity(); });
