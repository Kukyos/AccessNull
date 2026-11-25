// Nova's voice line: captions, the orb, yes/no, the address box, sheets, the microphone and her voice.
const $ = id => document.getElementById(id);
const said = $('said'), novaLine = $('nova'), body = document.body;

// ---------- height: the page sits right under the line, however many lines the caption needs ----------
new ResizeObserver(() => {
  const h = Math.ceil($('chrome').getBoundingClientRect().height);
  document.documentElement.style.setProperty('--chrome-h', h + 'px');
  nova.send('height', { h });
}).observe($('chrome'));

// ---------- what the brain shows ----------
let listening = false;
function showUi(ui = {}) {
  const st = ui.state || 'idle';
  body.classList.toggle('working', st === 'working');
  $('ask').hidden = st !== 'confirm';
  if (st === 'confirm') $('yes').focus();
  if (st === 'heard') { said.className = 'said'; said.textContent = ui.text; novaLine.className = 'nova quiet'; novaLine.textContent = 'On it…'; return; }
  if (st === 'idle' && !ui.text) {
    novaLine.className = 'nova quiet';
    novaLine.textContent = listening ? 'Listening. Say what you want done.' : 'Press Alt Shift A and say what you want done.';
    return;
  }
  novaLine.className = 'nova';
  novaLine.textContent = ui.text || '';
}
nova.on('brain', m => {
  if (m.type === 'ui') showUi(m.ui);
  if (m.type === 'listen') { listening = m.on; $('orb').setAttribute('aria-pressed', String(m.on)); showUi(m.ui); }
});
// live words from the ears, before the brain has them
nova.on('caption', c => {
  if (c.kind === 'partial') { said.className = 'said live'; said.textContent = c.text; }
  else if (c.kind === 'heard') { said.className = 'said'; said.textContent = c.text; }
  else { novaLine.className = 'nova'; novaLine.textContent = c.text; }
});

$('orb').onclick = () => nova.send('toggle');
$('yes').onclick = () => nova.send('confirm', { ok: true });
$('no').onclick = () => nova.send('confirm', { ok: false });
$('back').onclick = () => nova.send('back');
$('fwd').onclick = () => nova.send('forward');
$('reload').onclick = () => nova.send('reload');
$('caption').onclick = () => $('address').focus();
addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheets(); nova.send('stop'); } });

// ---------- address box: an address goes there, anything else is a request for Nova ----------
let pageUrl = '';
const hostOf = u => { try { return /^https?:/.test(u) ? new URL(u).hostname.replace(/^www\./, '') : ''; } catch { return ''; } };
$('addr').onsubmit = e => {
  e.preventDefault();
  const q = $('address').value.trim();
  if (q) nova.send('navigate', { text: q });
  $('address').value = '';
  $('address').blur();
};
$('address').onfocus = () => { $('address').value = /^https?:/.test(pageUrl) ? pageUrl : ''; $('address').select(); };
$('address').onblur = () => { $('address').value = ''; };
nova.on('focus-address', () => $('address').focus());

// ---------- tabs ----------
nova.on('tabs', ({ tabs, activeId }) => {
  const cur = tabs.find(t => t.id === activeId);
  pageUrl = cur?.url || '';
  if (document.activeElement !== $('address')) $('address').placeholder = /^https?:/.test(pageUrl) ? pageUrl.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '') : 'Ask Nova, or type an address';
  $('back').disabled = !cur?.canBack;
  $('fwd').disabled = !cur?.canForward;
  $('tabs').replaceChildren(...tabs.map(t => {
    const b = document.createElement('div');
    b.className = 'tab' + (t.status === 'loading' ? ' loading' : '');
    b.setAttribute('role', 'tab');
    b.tabIndex = 0;
    b.setAttribute('aria-selected', String(t.id === activeId));
    const icon = t.favicon ? Object.assign(document.createElement('img'), { src: t.favicon, alt: '' }) : Object.assign(document.createElement('span'), { className: 'dot' });
    icon.onerror = () => icon.replaceWith(Object.assign(document.createElement('span'), { className: 'dot' }));
    const title = Object.assign(document.createElement('span'), { className: 't', textContent: /^https?:/.test(t.url) ? t.title || hostOf(t.url) : 'New tab' });
    const x = Object.assign(document.createElement('button'), { className: 'x', textContent: '×', ariaLabel: 'Close tab', onclick: e => { e.stopPropagation(); nova.send('close', { id: t.id }); } });
    b.append(icon, title, x);
    b.onclick = () => nova.send('select', { id: t.id });
    b.onkeydown = e => e.key === 'Enter' && nova.send('select', { id: t.id });
    b.onauxclick = e => e.button === 1 && nova.send('close', { id: t.id });
    return b;
  }), Object.assign(document.createElement('button'), { className: 'newtab', textContent: '+', ariaLabel: 'New tab (Ctrl+T)', onclick: () => nova.send('newTab') }));
  if (!$('sheet-look').hidden) nova.wantView();
});

// ---------- sheets ----------
function openSheet(which) {
  closeSheets(false);
  $('scrim').hidden = false;
  $(`sheet-${which}`).hidden = false;
  nova.send('sheet', { open: true });
  if (which === 'look') nova.wantView();
  if (which === 'settings') loadSettings();
  $(`sheet-${which}`).querySelector('button, input, select')?.focus();
}
function closeSheets(tell = true) {
  const was = !$('scrim').hidden;
  for (const s of document.querySelectorAll('.sheet')) s.hidden = true;
  $('scrim').hidden = true;
  if (was && tell) nova.send('sheet', { open: false });
}
$('scrim').onclick = () => closeSheets();
$('look').onclick = () => ($('sheet-look').hidden ? openSheet('look') : closeSheets());
$('gear').onclick = () => ($('sheet-settings').hidden ? openSheet('settings') : closeSheets());
nova.on('open-sheet', openSheet);

// how this page looks
let view = { presets: [], hide: [] }, host = '';
nova.on('view', v => {
  view = v.view || { presets: [], hide: [] };
  host = v.host;
  $('look-host').textContent = host || 'this page';
  $('save-host').textContent = host || 'this site';
  $('save').checked = v.saved;
  for (const b of document.querySelectorAll('.presets button')) b.setAttribute('aria-pressed', String(view.presets.includes(b.dataset.p)));
  $('hidden-count').textContent = view.hide.length ? `${view.hide.length} part${view.hide.length > 1 ? 's' : ''} of this page ${view.hide.length > 1 ? 'are' : 'is'} hidden for you.` : '';
  $('look').classList.toggle('on', !!(view.presets.length || view.hide.length));
});
const look = v => nova.send('look', { view: { save: $('save').checked, ...v } });
for (const b of document.querySelectorAll('.presets button')) b.onclick = () => {
  const on = b.getAttribute('aria-pressed') !== 'true';
  look({ presets: on ? [...view.presets, b.dataset.p] : view.presets.filter(p => p !== b.dataset.p), style: on ? [b.dataset.p] : [] });
};
$('keep').onsubmit = e => { e.preventDefault(); const k = $('keep-what').value.trim(); if (k) look({ keep: k }); };
$('save').onchange = () => look({ style: [], unsave: !$('save').checked });
$('original').onclick = () => { $('save').checked = false; look({ style: ['original'] }); };

// settings: the same keys the voice commands change
async function loadSettings() {
  const s = await nova.get('local', ['lang', 'narrate', 'tier', 'rate']);
  const { confirm } = await nova.get('session', ['confirm']);
  $('lang').value = s.lang || 'en-IN';
  $('confirm').checked = confirm !== 'off';
  $('narrate').checked = s.narrate !== 'off';
  for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-checked', String(b.dataset.tier === (s.tier || 'cheap')));
  $('rate').value = s.rate || 1;
  $('rate-out').textContent = `${(+$('rate').value).toFixed(1)}×`;
}
$('lang').onchange = e => nova.set('local', { lang: e.target.value });
$('confirm').onchange = e => nova.set('session', { confirm: e.target.checked ? 'on' : 'off' });
$('narrate').onchange = e => nova.set('local', { narrate: e.target.checked ? 'on' : 'off' });
$('rate').oninput = e => { $('rate-out').textContent = `${(+e.target.value).toFixed(1)}×`; nova.set('local', { rate: e.target.value }); };
for (const b of document.querySelectorAll('.seg button')) b.onclick = () => { nova.set('local', { tier: b.dataset.tier }); loadSettings(); };
nova.on('storage-changed', () => { if (!$('sheet-settings').hidden) loadSettings(); });

// ---------- her voice ----------
let audio = null, playingId = null, userTalking = false;
nova.on('play', ({ id, audio: bytes, text, rate, lang }) => {
  playingId = id;
  body.classList.add('speaking');
  const done = () => { if (playingId === id) { playingId = null; body.classList.remove('speaking'); } nova.played(id); };
  if (bytes) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    audio = new Audio(url);
    audio.playbackRate = rate;
    audio.volume = userTalking ? 0.35 : 1;
    audio.onended = audio.onerror = audio.onpause = () => { URL.revokeObjectURL(url); done(); };
    audio.play().catch(done);
  } else {
    const u = new SpeechSynthesisUtterance(text); // no ElevenLabs key or no network: the system voice
    u.lang = lang; u.rate = rate;
    u.onend = u.onerror = done;
    speechSynthesis.speak(u);
  }
});
nova.on('hush', () => { audio?.pause(); speechSynthesis.cancel(); body.classList.remove('speaking'); });

// ---------- her ears: mic → 16 kHz PCM → main (Speko streaming), only while someone is talking ----------
let mic = null;
nova.on('mic', on => (on ? startMic() : stopMic()));
async function startMic() {
  if (mic) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    const ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.audioWorklet.addModule('mic-worklet.js');
    const node = new AudioWorkletNode(ctx, 'pcm');
    ctx.createMediaStreamSource(stream).connect(node);
    mic = { stream, ctx, node };
    // a simple voice detector: send speech (plus a little before it), tell main when it stops
    let floor = 0.01, talking = false, quiet = 0;
    const pre = [];
    node.port.onmessage = ({ data: { pcm, rms } }) => {
      const thresh = Math.max(0.018, floor * 2.8) * (playingId ? 1.8 : 1); // her own voice leaks a little even with echo cancelling
      document.documentElement.style.setProperty('--level', Math.min(1, rms * 9).toFixed(3));
      if (rms > thresh) {
        if (!talking) { console.log('speech start', rms.toFixed(3), thresh.toFixed(3)); talking = true; userTalking = true; if (audio) audio.volume = 0.35; for (const p of pre.splice(0)) nova.pcm(p); }
        quiet = 0;
        nova.pcm(pcm);
      } else if (talking) {
        nova.pcm(pcm);
        if (++quiet >= 6) { // 0.6 s of quiet: the sentence is over
          talking = false; userTalking = false; quiet = 0;
          if (audio) audio.volume = 1;
          nova.utteranceEnd();
        }
      } else {
        floor = floor * 0.95 + rms * 0.05;
        pre.push(pcm); if (pre.length > 3) pre.shift();
      }
    };
  } catch (e) {
    novaLine.className = 'nova';
    novaLine.textContent = "I can't reach the microphone. Check that one is plugged in and allowed.";
  }
}
function stopMic() {
  if (!mic) return;
  mic.stream.getTracks().forEach(t => t.stop());
  mic.ctx.close();
  mic = null;
  document.documentElement.style.setProperty('--level', 0);
}
