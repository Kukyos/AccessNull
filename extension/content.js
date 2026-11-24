// AccessNull — content script. The page's hands and eyes: snapshot, numbered marks, actions.
// Stateless on purpose: the agent loop lives in the side panel and survives navigation;
// this script is re-injected on every page load.
(() => {
  if (window.__accessnull) return; // injected twice (manifest + scripting fallback)

  const INTERACTIVE =
    'a[href],button,input:not([type=hidden]),select,textarea,summary,[contenteditable=""],[contenteditable=true],' +
    '[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=radio],[role=switch],[role=option],[role=combobox],[role=searchbox],[role=textbox],[onclick],[tabindex="0"]';
  const MAX = 250;
  let refs = []; // mark number -> live DOM node, rebuilt on every snapshot

  const clean = s => (s || '').replace(/\s+/g, ' ').trim();

  function labelFor(el) {
    const by = el.getAttribute('aria-labelledby');
    const labelled = by && clean(by.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' '));
    const forLabel = el.id && clean(document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent);
    const wrapLabel = clean(el.closest('label')?.textContent);
    const img = el.querySelector?.('img[alt]')?.alt;
    return clean(
      el.getAttribute('aria-label') || labelled || forLabel ||
      (el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type) && el.value) ||
      el.placeholder || wrapLabel || el.title || el.alt || img ||
      (el.tagName !== 'SELECT' && el.textContent) || el.name || ''
    ).slice(0, 90);
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
    return r;
  }

  function describe(el, i, r) {
    const tag = el.tagName.toLowerCase();
    const d = { i, tag, label: labelFor(el) };
    const role = el.getAttribute('role');
    if (role) d.role = role;
    if (tag === 'input') d.type = el.type;
    if (tag === 'a') d.href = (el.getAttribute('href') || '').slice(0, 80);
    if ('value' in el && tag !== 'button' && el.type !== 'submit' && el.value) d.value = String(el.value).slice(0, 60);
    if (tag === 'select') d.options = [...el.options].slice(0, 15).map(o => clean(o.text));
    if (el.checked) d.checked = true;
    if (el.disabled) d.disabled = true;
    if (r.bottom < 0 || r.top > innerHeight) d.offscreen = true;
    return d;
  }

  // Whole-page snapshot: in-view elements first, then the rest, up to MAX.
  function snapshot({ marks = true } = {}) {
    refs = [];
    const inView = [], below = [];
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      if (el.closest('#accessnull-root')) continue;
      const r = visible(el);
      if (!r) continue;
      (r.bottom >= 0 && r.top <= innerHeight ? inView : below).push([el, r]);
    }
    const elements = [];
    for (const [el, r] of [...inView, ...below]) {
      const d = describe(el, elements.length + 1, r);
      if (!d.label && !['input', 'textarea', 'select'].includes(d.tag)) continue; // unlabeled icon: vision fallback territory
      refs[d.i] = el;
      elements.push(d);
      if (elements.length >= MAX) break;
    }
    if (marks) drawMarks();
    return {
      url: location.href,
      title: document.title,
      scroll: { y: Math.round(scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight) },
      elements,
      media: [...document.querySelectorAll('video,audio')].filter(m => !m.paused && !m.ended && m.currentTime > 0).length
        ? 'a video/audio is playing on this page' : 'nothing is playing',
      text: pageText(3500),
    };
  }

  function pageText(limit) {
    const root = document.querySelector('main,article,[role=main]') || document.body;
    return clean(root?.innerText).slice(0, limit);
  }

  // ---------- read aloud: readable blocks from where the user is, with a soft highlight ----------
  let blocks = [], lit = null;
  function readable() {
    const root = document.querySelector('main,article,[role=main]') || document.body;
    blocks = [...root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre')].filter(el => {
      if (el.closest('nav,header,footer,aside,#accessnull-root') || el.querySelector('p,li')) return false;
      const r = visible(el);
      return r && r.bottom > 60 && clean(el.innerText).length > 2;
    });
    return blocks.map((el, i) => ({ i, text: clean(el.innerText).slice(0, 1200) }));
  }
  function highlight(i) {
    if (lit) { lit.style.backgroundColor = lit.dataset.anBg || ''; lit.style.boxShadow = lit.dataset.anShadow || ''; }
    lit = blocks[i];
    if (!lit) return;
    lit.dataset.anBg = lit.style.backgroundColor; lit.dataset.anShadow = lit.style.boxShadow;
    lit.style.transition = 'background-color .3s';
    lit.style.backgroundColor = 'rgba(255, 214, 10, .28)';
    lit.style.boxShadow = '0 0 0 6px rgba(255, 214, 10, .28)';
    lit.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ---------- numbered marks overlay (set-of-marks, so users can also say "click 7") ----------
  let overlay = null;
  function drawMarks() {
    clearMarks();
    overlay = document.createElement('div');
    overlay.id = 'accessnull-root';
    overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646';
    for (let i = 1; i < refs.length; i++) {
      const el = refs[i];
      const r = el?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > innerHeight) continue;
      const tag = document.createElement('div');
      tag.textContent = i;
      tag.style.cssText =
        `position:fixed;left:${Math.max(0, r.left - 4)}px;top:${Math.max(0, r.top - 8)}px;` +
        'background:#ffd60a;color:#000;font:700 11px/14px system-ui;padding:0 4px;border-radius:7px;' +
        'box-shadow:0 0 0 1.5px #000';
      overlay.appendChild(tag);
    }
    document.documentElement.appendChild(overlay);
  }
  function clearMarks() {
    overlay?.remove();
    overlay = null;
  }
  // marks go stale when the page moves
  addEventListener('scroll', () => overlay && clearMarks(), { passive: true });

  function flash(el) {
    const ring = document.createElement('div');
    const r = el.getBoundingClientRect();
    ring.style.cssText =
      `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;` +
      'border:3px solid #ffd60a;border-radius:8px;box-shadow:0 0 0 3px #000,0 0 24px #ffd60a;' +
      'pointer-events:none;z-index:2147483647;transition:opacity .6s';
    ring.id = 'accessnull-root';
    document.documentElement.appendChild(ring);
    setTimeout(() => (ring.style.opacity = 0), 700);
    setTimeout(() => ring.remove(), 1400);
  }

  // ---------- actions ----------
  // React/Vue track value via the prototype setter; plain `el.value = x` is silently ignored by them.
  function setValue(el, text) {
    el.focus();
    if (el.isContentEditable) {
      document.execCommand('selectAll');
      document.execCommand('insertText', false, text);
      return;
    }
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function pressEnter(el) {
    for (const type of ['keydown', 'keypress', 'keyup'])
      el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    const form = el.form || el.closest?.('form');
    if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
  }

  function isSecret(el) {
    const ac = (el.autocomplete || '') + ' ' + (el.name || '') + ' ' + (el.id || '');
    return el.type === 'password' || /cc-|card|cvv|cvc|otp|one-time/i.test(ac);
  }

  async function act(a) {
    const el = a.i != null ? refs[a.i] : null;
    if (a.i != null && !el?.isConnected) return { ok: false, error: `element ${a.i} is gone, take a new snapshot` };
    clearMarks();
    switch (a.type) {
      case 'click': {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        flash(el);
        await new Promise(r => setTimeout(r, 250));
        el.focus?.();
        // new tabs disorient someone who can't see them: keep the journey in one tab
        el.closest('a[target]')?.removeAttribute('target');
        el.click();
        return { ok: true, did: `clicked "${labelFor(el)}"` };
      }
      case 'type': {
        if (!el) return { ok: false, error: 'type needs an element number' };
        if (isSecret(el)) return { ok: false, error: 'refused: passwords and card details must be typed by the user' };
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        flash(el);
        setValue(el, a.text ?? '');
        if (a.submit) pressEnter(el);
        return { ok: true, did: `typed "${a.text}" into "${labelFor(el)}"${a.submit ? ' and pressed Enter' : ''}` };
      }
      case 'fill': {
        const done = [], failed = [];
        for (const f of a.fields || []) {
          const el = refs[f.i];
          if (!el?.isConnected) { failed.push(`${f.i} gone`); continue; }
          if (isSecret(el)) { failed.push(`refused secret field "${labelFor(el)}"`); continue; }
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          flash(el);
          if (f.check != null) {
            if (el.checked !== !!f.check) el.click();
          } else if (f.option != null && el.tagName === 'SELECT') {
            const opt = [...el.options].find(o => clean(o.text).toLowerCase().includes(String(f.option).toLowerCase()));
            if (!opt) { failed.push(`no option "${f.option}"`); continue; }
            el.value = opt.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else setValue(el, f.text ?? '');
          done.push(labelFor(el));
          await new Promise(r => setTimeout(r, 180)); // visible, one field at a time
        }
        return { ok: done.length > 0, did: `filled ${done.join(', ')}${failed.length ? `; problems: ${failed.join(', ')}` : ''}`, error: failed.join(', ') };
      }
      case 'select': {
        if (el?.tagName !== 'SELECT') return { ok: false, error: 'not a dropdown' };
        const opt = [...el.options].find(o => clean(o.text).toLowerCase() === String(a.text).toLowerCase()) ||
          [...el.options].find(o => clean(o.text).toLowerCase().includes(String(a.text).toLowerCase()));
        if (!opt) return { ok: false, error: `no option "${a.text}"` };
        flash(el);
        el.value = opt.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, did: `selected "${clean(opt.text)}"` };
      }
      case 'scroll': {
        const dy = a.dir === 'up' ? -0.8 * innerHeight : 0.8 * innerHeight;
        if (a.dir === 'top') scrollTo({ top: 0 });
        else if (a.dir === 'bottom') scrollTo({ top: document.documentElement.scrollHeight });
        else scrollBy({ top: dy });
        return { ok: true, did: `scrolled ${a.dir}` };
      }
      case 'read':
        return { ok: true, did: 'read the page', text: pageText(9000) };
      default:
        return { ok: false, error: `unknown action ${a.type}` };
    }
  }

  // ---------- the glass pill: the only UI a user ever sees ----------
  // Shadow DOM so the site's CSS can't touch it; bottom-centre so it never covers the page's own controls for long.
  const PILL_CSS = `
    :host { all: initial; }
    .wrap { position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 140%); z-index: 2147483647;
      transition: transform .55s cubic-bezier(.16,1,.3,1), opacity .3s; opacity: 0; pointer-events: none; }
    .wrap.on { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
    .pill { display: flex; align-items: center; gap: 12px; min-width: 220px; max-width: min(640px, calc(100vw - 32px));
      padding: 10px 18px 10px 10px; border-radius: 30px;
      background: rgba(255,255,255,.62); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,.7); box-shadow: 0 12px 40px rgba(0,0,0,.18), 0 1px 0 rgba(255,255,255,.8) inset;
      font: 500 16px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", system-ui, sans-serif;
      color: #111; letter-spacing: -.01em; transition: border-radius .4s; }
    .orb { flex: none; width: 34px; height: 34px; border-radius: 50%; position: relative; overflow: hidden;
      background: conic-gradient(from 0deg, #ffd60a, #ff9f0a, #ff375f, #bf5af2, #0a84ff, #ffd60a);
      box-shadow: 0 0 0 1px rgba(0,0,0,.06); }
    .orb::after { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: rgba(255,255,255,.85); transition: inset .4s; }
    .listening .orb::after { inset: 11px; }
    .working .orb { animation: spin 1.4s linear infinite; }
    .working .orb::after { inset: 9px; }
    .listening .orb, .reading .orb { animation: breathe 1.8s ease-in-out infinite; }
    .reading .orb::after { inset: 9px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes breathe { 50% { transform: scale(.88); } }
    @media (prefers-reduced-motion: reduce) { .orb { animation: none !important; } }
    .text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text.long { white-space: normal; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
    .heard .text { font-style: italic; color: #333; }
    .btns { display: none; gap: 8px; flex: none; }
    .confirm .btns { display: flex; }
    button { all: unset; cursor: pointer; padding: 8px 16px; border-radius: 20px; font: 600 15px/1 inherit; font-family: inherit; }
    .yes { background: #111; color: #fff; }
    .no { background: rgba(0,0,0,.07); color: #111; }
    button:focus-visible { outline: 3px solid #0a84ff; outline-offset: 2px; }
    .x { padding: 6px 8px; color: #666; font-size: 18px; }
    .confirm .x { display: none; }
    @media (prefers-color-scheme: dark) {
      .pill { background: rgba(30,30,32,.62); border-color: rgba(255,255,255,.12); color: #f5f5f7; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
      .orb::after { background: rgba(30,30,32,.9); }
      .heard .text { color: #ccc; } .yes { background: #f5f5f7; color: #111; } .no { background: rgba(255,255,255,.12); color: #f5f5f7; } .x { color: #aaa; }
    }`;
  let host = null, pillEl = null;
  function pill() {
    if (host?.isConnected) return pillEl;
    host = document.createElement('accessnull-pill');
    host.id = 'accessnull-root';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${PILL_CSS}</style>
      <div class="wrap" role="status" aria-live="polite">
        <div class="pill"><div class="orb" aria-hidden="true"></div><div class="text"></div>
          <div class="btns"><button class="yes">Yes</button><button class="no">No</button></div>
          <button class="x" aria-label="Close AccessNull">×</button></div></div>`;
    pillEl = root.querySelector('.wrap');
    root.querySelector('.yes').onclick = () => chrome.runtime.sendMessage({ type: 'confirm', ok: true });
    root.querySelector('.no').onclick = () => chrome.runtime.sendMessage({ type: 'confirm', ok: false });
    root.querySelector('.x').onclick = () => chrome.runtime.sendMessage({ type: 'close' });
    document.documentElement.appendChild(host);
    return pillEl;
  }
  const IDLE_TEXT = 'Listening…';
  let hideTimer = 0;
  function render(ui, visible = true) {
    const w = pill();
    clearTimeout(hideTimer);
    if (!visible) return w.classList.remove('on');
    const state = ui?.state || 'idle';
    w.className = `wrap on ${state === 'idle' ? 'listening' : state === 'ask' ? 'listening' : state}`;
    const text = w.querySelector('.text');
    text.textContent = state === 'heard' ? `“${ui.text}”` : ui?.text || IDLE_TEXT;
    text.classList.toggle('long', text.textContent.length > 70);
    if (state === 'confirm') w.querySelector('.yes').focus();
    // a finished answer stays long enough to read, then the pill relaxes back to listening
    if (state === 'done') hideTimer = setTimeout(() => render({ state: 'idle' }, listening), 9000);
  }

  // ---------- voice in ----------
  // ponytail: recognition runs in the page, so Chrome asks for the mic once per site; ElevenLabs Scribe in an offscreen doc removes that.
  let listening = false, rec = null;
  function listen(on) {
    listening = on;
    if (!on) return rec?.stop(), (rec = null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || rec) return;
    rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    chrome.storage.local.get('lang').then(({ lang }) => (rec.lang = lang || 'en-IN'));
    rec.onresult = e => {
      const r = e.results[e.results.length - 1];
      const text = r[0].transcript.trim();
      if (r.isFinal) chrome.runtime.sendMessage({ type: 'heard', text });
    };
    rec.onend = () => listening && rec && setTimeout(() => { try { rec.start(); } catch {} }, 150);
    try { rec.start(); } catch {}
  }

  addEventListener('keydown', e => e.key === 'Escape' && listening && chrome.runtime.sendMessage({ type: 'stop' }));

  // on every page load: rejoin a running task / keep listening across navigations
  globalThis.chrome?.runtime?.sendMessage?.({ type: 'hello' }).then(r => {
    if (!r?.listening) return;
    listen(true);
    render(r.ui);
  }).catch(() => {});

  globalThis.chrome?.runtime?.onMessage?.addListener((msg, _s, reply) => {
    (async () => {
      try {
        if (msg.type === 'ui') reply(render(msg.ui));
        else if (msg.type === 'listen') reply((listen(msg.on), render(msg.ui, msg.on)));
        // the extension itself (never the page) can inject a heard phrase: used by the demo recorder
        else if (msg.type === 'heard') reply(chrome.runtime.sendMessage({ type: 'heard', text: msg.text }));
        else if (msg.type === 'readable') reply(readable());
        else if (msg.type === 'highlight') reply(highlight(msg.i));
        else if (msg.type === 'snapshot') reply(snapshot(msg));
        else if (msg.type === 'act') reply(await act(msg.action));
        else if (msg.type === 'clearMarks') reply(clearMarks());
        else if (msg.type === 'label') reply({ label: refs[msg.i] ? labelFor(refs[msg.i]) : null, secret: refs[msg.i] ? isSecret(refs[msg.i]) : false });
      } catch (e) {
        reply({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  });

  window.__accessnull = { snapshot, act, labelFor, setValue, isSecret }; // for test.html
})();
