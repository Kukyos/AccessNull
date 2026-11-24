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
      text: pageText(3500),
    };
  }

  function pageText(limit) {
    const root = document.querySelector('main,article,[role=main]') || document.body;
    return clean(root?.innerText).slice(0, limit);
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

  globalThis.chrome?.runtime?.onMessage?.addListener((msg, _s, reply) => {
    (async () => {
      try {
        if (msg.type === 'snapshot') reply(snapshot(msg));
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
