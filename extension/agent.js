// AccessNull — the agent loop. Observe (snapshot) → decide (LLM) → gate (safety) → act → repeat.
// Runs in the side panel, so it survives page navigations that wipe the content script.

export const MAX_STEPS = 20;

// Anything matching this needs a spoken "yes" first, whatever the model says. Code-enforced, not prompt-enforced.
export const IRREVERSIBLE =
  /\b(pay|place (your )?order|buy|purchase|checkout|check out|submit|send|delete|remove|confirm|book|transfer|subscribe|sign up|register|post|publish|unsubscribe|cancel (my |the )?(order|subscription|booking))\b/i;

// Reversible steps the model sometimes over-flags; never worth interrupting the user for.
export const SAFE = /^(add to (cart|basket|bag)|continue|next|search|go|show more|see more|load more)$/i;

export function needsConfirm(action, el) {
  if (action.type === 'click' && el && SAFE.test((el.label || '').trim()) && !IRREVERSIBLE.test(el.label || '')) return false;
  if (action.risky) return true;
  return action.type === 'click' && !!el && IRREVERSIBLE.test(el.label || '');
}

const SYSTEM = `You are AccessNull, a web agent for blind, low-vision and motor-impaired people. The user cannot see or use a mouse. You act on the real web page on their behalf and keep them informed by voice.

Each turn you get: the user's goal, the steps taken so far, the current page (url, title, scroll, visible text), and its interactive elements, one per line: N role:type "label" =current value [options] (offscreen). N is the element number you act on.

Reply with ONLY one JSON object:
{"thought": "your private reasoning, one sentence",
 "say": "spoken aloud to the user, max 12 words, plain friendly language, no element numbers. Use it on the first step (what you're about to do) and when you learn something new. Otherwise empty string: the user hears silence while you work, do not narrate every click",
 "action": ONE OF
   {"type":"click","i":N}
   {"type":"type","i":N,"text":"...","submit":true|false}   // submit=true presses Enter (good for search boxes)
   {"type":"fill","fields":[{"i":N,"text":"..."},{"i":N,"check":true},{"i":N,"option":"..."}]}   // fill a whole form in one step: text inputs, checkboxes/radios (check), dropdowns (option). Never submits
   {"type":"select","i":N,"text":"option text"}
   {"type":"scroll","dir":"down"|"up"|"top"|"bottom"}
   {"type":"navigate","url":"https://..."}                  // go straight to a site you know
   {"type":"back"}
   {"type":"read"}                                         // get the full page text when the snapshot text is not enough
   {"type":"look"}                                         // get a description of a screenshot, for unlabeled or visual pages
   {"type":"readaloud"}                                    // read the page's main text aloud to the user, from where they are. Use when they want an article, story or book read to them (navigate to it first)
   {"type":"ask","question":"..."}                         // ask the user when the goal is ambiguous or you need their choice
   {"type":"done","answer":"..."}                          // goal reached: spoken to the user. Answer EVERY part of the question (who AND when AND where…) in one or two short sentences, with the exact facts from the page
 , "risky": true|false }

Rules:
- One action per turn. After it, you will see the new page.
- Prefer the fastest route: navigate directly to well-known sites (e.g. https://en.wikipedia.org/wiki/Special:Search?search=...), use the site's search box.
- Continue/Next/Search buttons and adding to a cart are NOT risky. Set "risky": true for anything that spends money, sends or posts something, submits a form, deletes, or books. The user will be asked to confirm.
- Never type passwords, card numbers, CVV or OTPs, even if the user tells you them, and never ask permission to. For a sign-in: use the site's own email/username form (not "Continue with Google/Apple/Facebook"), fill the email or username, press Continue/Next if the password box is on the next page, and once the password box is on screen finish with "done" telling the user the password box is ready and they should type it themselves, because you never handle passwords.
- Elements marked offscreen are fine to click. If what you need is not in the list, scroll or read.
- If an action failed, try a different approach, do not repeat the same failing action.
- Only use "done" when the CURRENT page proves the goal is achieved (the video page is open and media says playing, the item shows in the cart, the answer is in the page text). Never claim something happened that the page does not show; if unsure, check first.
- When the user only asks what is on the page, answer with "done" right away, summarising the page in plain words.
- Write "say", "question" and "answer" in the user's language: {LANG}.`;

export async function decide({ goal, history, snap, settings }) {
  const user = {
    goal,
    // bulky page_text / screen only matter right after the read/look that produced them
    steps_so_far: history.slice(-10).map((h, k, a) => (k === a.length - 1 ? h : { ...h, page_text: undefined, screen: undefined })),
    page: { url: snap.url, title: snap.title, scroll: snap.scroll, media: snap.media, text: snap.text },
    elements: compact(snap.elements),
  };
  const body = {
    model: settings.model || 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM.replace('{LANG}', settings.langName || 'English') },
      { role: 'user', content: JSON.stringify(user) },
    ],
  };
  const res = await fetch(`${settings.apiBase || 'https://api.groq.com/openai/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return parseDecision(data.choices[0].message.content);
}

// One short line per element instead of JSON objects: ~3x fewer tokens, keeps free-tier rate limits happy.
// ponytail: 140-element cap; in-view elements come first from the snapshot, so the cut drops the far-offscreen tail.
export function compact(elements, cap = 140) {
  return elements.slice(0, cap).map(e =>
    `${e.i} ${e.role || e.tag}${e.type && e.type !== 'text' ? ':' + e.type : ''} "${e.label}"` +
    (e.value ? ` =${JSON.stringify(e.value)}` : '') +
    (e.options ? ` [${e.options.join('|')}]` : '') +
    (e.checked ? ' checked' : '') + (e.disabled ? ' disabled' : '') + (e.offscreen ? ' (offscreen)' : '')
  ).join('\n');
}

export function parseDecision(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI reply was not JSON');
  const d = JSON.parse(m[0]);
  // models drift between shapes: {"action":"done","answer":..} or {"type":"click",..} at the top level
  if (typeof d.action === 'string') d.action = { ...d, type: d.action, action: undefined };
  else if (!d.action && typeof d.type === 'string') d.action = { ...d };
  if (!d.action || typeof d.action.type !== 'string') throw new Error('AI reply had no action');
  if (d.risky != null && d.action.risky == null) d.action.risky = !!d.risky;
  return d;
}

// Vision: screenshot of the tab (with the numbered marks drawn on it) → plain description.
export async function look({ goal, settings, windowId }) {
  const shot = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 60 });
  const res = await fetch(`${settings.apiBase || 'https://api.groq.com/openai/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.visionModel || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Describe this web page screenshot for someone who cannot see it, in under 120 words. Yellow number tags mark clickable elements: say which number does what, especially icon-only buttons with no text. The user's goal: ${goal}` },
          { type: 'image_url', image_url: { url: shot } },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`vision ${res.status}`);
  return (await res.json()).choices[0].message.content;
}

export const STOP = /^(stop|cancel|abort|quiet|shut up|ruko|bas)\b/i;

// Our own voice coming back through the mic. Matters most for confirmations: an echoed question must never count as a yes.
export function isEcho(t, said, busy, sinceMs, strict) {
  if (STOP.test(t)) return false;
  // strict = a confirmation is waiting: anything heard while or just after we spoke is discarded
  if (strict && (busy || sinceMs < 1200)) return true; // final transcripts land a moment after the audio stops
  const words = t.split(/\s+/).filter(w => w.length > 2);
  const overlap = words.length ? words.filter(w => said.includes(w)).length / words.length : 0;
  return words.length >= 2 && overlap > (busy ? 0.3 : 0.6);
}

// ---------- offline matcher: "click sign in" without any AI ----------
// ponytail: token overlap + synonyms + typo tolerance; goal mode still needs the planner.
const SYN = [
  ['sign in', 'log in', 'login', 'signin'], ['sign up', 'register', 'create account', 'join'],
  ['cart', 'basket', 'bag', 'trolley'], ['search', 'find', 'look up'], ['menu', 'navigation', 'hamburger'],
  ['home', 'homepage', 'main page'], ['close', 'dismiss', 'x'], ['next', 'continue', 'forward'],
  ['previous', 'prev', 'back'], ['buy', 'purchase'], ['settings', 'preferences', 'options'],
  ['contact', 'contact us', 'support', 'help'], ['profile', 'account', 'my account'],
];
const norm = s => ' ' + s.toLowerCase().replace(/[^a-z0-9ऀ-෿ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const canon = s => { let n = norm(s); for (const g of SYN) for (const w of g.slice(1)) n = n.replaceAll(` ${w} `, ` ${g[0]} `); return n.trim(); };
function close(a, b) { // one typo allowed for words of 5+ letters (speech recognition slips)
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, miss = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++miss > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
}
export function matchLabel(target, elements) {
  const t = canon(target);
  if (!t) return null;
  const tw = t.split(' ');
  let best = null, bestScore = 0;
  for (const el of elements) {
    const l = canon(el.label || '');
    if (!l) continue;
    if (l === t) return el;
    const lw = l.split(' ');
    const hits = tw.filter(w => lw.some(x => close(w, x))).length;
    const score = hits / tw.length - 0.02 * Math.max(0, lw.length - tw.length) - (el.offscreen ? 0.05 : 0);
    if (score > bestScore) [best, bestScore] = [el, score];
  }
  return bestScore >= 0.6 ? best : null;
}

// ---------- tab plumbing ----------
export async function activeTab() {
  // the active web tab, ignoring our own pages, so the panel also works when opened as a tab/window
  const tabs = await chrome.tabs.query({ active: true });
  const web = tabs.filter(t => !t.url?.startsWith('chrome-extension:'));
  return web.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0] || tabs[0];
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function settle(tabId) {
  await sleep(500);
  for (let t = 0; t < 40; t++) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || tab.status === 'complete') break;
    await sleep(200);
  }
  await sleep(300);
}

export async function send(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    // content script not there yet (page loaded before install, or mid-navigation): inject and retry once
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }).catch(() => {});
    await sleep(200);
    return chrome.tabs.sendMessage(tabId, msg);
  }
}

// ---------- the loop ----------
// io: { say(text), confirm(question) -> bool, ask(question) -> string, log(kind, text), aborted() -> bool }
export async function run(goal, settings, io) {
  const history = [];
  let lastSay = '';
  for (let step = 1; step <= MAX_STEPS; step++) {
    if (io.aborted()) return io.log('stop', 'Stopped.');
    const tab = await activeTab();
    if (!tab?.id || /^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
      // can't script browser pages: start the agent from a real site
      await chrome.tabs.update(tab.id, { url: 'https://duckduckgo.com' });
      await settle(tab.id);
      continue;
    }

    let snap;
    try {
      // a page that is still loading may not answer yet: give it a few tries
      for (let tries = 0; ; tries++) {
        try {
          snap = await send(tab.id, { type: 'snapshot', marks: !!settings.showMarks }); // numbers stay hidden unless the user asked for them
          if (snap?.elements) break;
        } catch (e) { if (tries >= 3) throw e; }
        if (tries >= 3) throw new Error('no snapshot');
        await settle(tab.id);
      }
    } catch (e) {
      io.log('error', `Can't read this page (${e.message}).`);
      return io.say("Sorry, I can't read this page.");
    }

    let d;
    try {
      io.log('think', `Step ${step}: thinking…`);
      d = await decide({ goal, history, snap, settings }).catch(() => decide({ goal, history, snap, settings })); // one retry
    } catch (e) {
      io.log('error', e.message);
      return io.say('Sorry, the AI did not answer properly. Please try again.');
    }
    if (io.aborted()) return io.log('stop', 'Stopped.');

    const a = d.action;
    const el = a.i != null ? snap.elements.find(x => x.i === a.i) : null;
    io.log('plan', `${d.thought || ''} :: ${JSON.stringify(a)}`);
    // a model trying to type a secret is stopped before it even narrates it: hand the moment to the user
    const SECRET = /password|passcode|card number|cvv|cvc|otp|one-time/i;
    const secretField = e => e?.tag === 'input' && (e.type === 'password' || SECRET.test(e.label || ''));
    const targets = a.type === 'fill' ? (a.fields || []).map(f => snap.elements.find(x => x.i === f.i)) : [el];
    const asksForSecret = a.type === 'ask' && SECRET.test(a.question || d.say || '');
    if (asksForSecret || ((a.type === 'type' || a.type === 'fill') && targets.some(secretField))) {
      if (a.type === 'fill') a.fields = a.fields.filter(f => !secretField(snap.elements.find(x => x.i === f.i)));
      if (asksForSecret || a.type === 'type' || !a.fields.length) {
        await send(tab.id, { type: 'clearMarks' }).catch(() => {});
        io.log('done', 'Handed the password to the user.');
        return io.say("The password box is ready. Please type it yourself. I never handle passwords.", { wait: true });
      }
    }
    if (d.say && d.say !== lastSay && a.type !== 'done' && a.type !== 'ask') io.say((lastSay = d.say));

    if (a.type === 'done') {
      io.log('done', a.answer || d.say || 'Done.');
      await send(tab.id, { type: 'clearMarks' }).catch(() => {});
      return io.say(a.answer || d.say || 'Done.', { wait: true });
    }

    if (a.type === 'readaloud') {
      await send(tab.id, { type: 'clearMarks' }).catch(() => {});
      return io.readAloud(); // d.say was already spoken above
    }

    if (a.type === 'ask') {
      const reply = await io.ask(a.question || d.say);
      history.push({ step, action: a, result: `user replied: ${reply}` });
      continue;
    }

    if (needsConfirm(a, el)) {
      const what = el ? `${a.type} "${el.label}"` : a.type;
      const ok = await io.confirm(d.say ? `${d.say} Should I continue?` : `I'm about to ${what}. Should I continue?`);
      if (!ok) {
        // a "no" ends the task: never re-ask the same irreversible step in another form
        await send(tab.id, { type: 'clearMarks' }).catch(() => {});
        io.log('stop', "Okay, I've stopped there.");
        return io.say("Okay, I've stopped there. Nothing was submitted.", { wait: true });
      }
    }

    let result;
    try {
      if (a.type === 'navigate') {
        await chrome.tabs.update(tab.id, { url: a.url });
        result = { ok: true, did: `opened ${a.url}` };
      } else if (a.type === 'back') {
        await chrome.tabs.goBack(tab.id);
        result = { ok: true, did: 'went back' };
      } else if (a.type === 'look') {
        // the vision model needs the numbers in the picture: draw them just for the screenshot
        await send(tab.id, { type: 'snapshot', marks: true });
        const desc = await look({ goal, settings, windowId: tab.windowId }).finally(() =>
          settings.showMarks || send(tab.id, { type: 'clearMarks' }).catch(() => {}));
        result = { ok: true, did: 'looked at the screen', description: desc };
      } else {
        result = await send(tab.id, { type: 'act', action: a });
      }
    } catch (e) {
      result = { ok: false, error: String(e.message || e) };
    }
    io.log(result.ok ? 'act' : 'error', result.did || result.error);
    // full page text is only useful for the very next decision; keep history small
    history.push({ step, action: a, result: result.ok ? result.did : `FAILED: ${result.error}`, ...(result.text && { page_text: result.text }), ...(result.description && { screen: result.description }) });
    if (['click', 'navigate', 'back'].includes(a.type) || a.submit) await settle(tab.id);
  }
  io.say('That took too many steps, so I stopped. Try a more specific request.');
}
