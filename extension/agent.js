// AccessNull — the agent loop. Observe (snapshot) → decide (LLM) → gate (safety) → act → repeat.
// Runs in the side panel, so it survives page navigations that wipe the content script.

export const MAX_STEPS = 25;

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

const SYSTEM = `You are Nova, the voice assistant inside the AccessNull browser: a web agent for blind, low-vision and motor-impaired people. The user cannot see or use a mouse. You act on the real web page on their behalf and keep them informed by voice.

Each turn you get: the user's goal, anything they said since it started (said_meanwhile: follow it, it can change the goal), your notes so far, the steps taken so far, the current page (url, title, scroll, visible text), and its interactive elements, one per line: N role:type "label" =current value [options] (offscreen). N is the element number you act on.

Reply with ONLY one JSON object:
{"thought": "your private reasoning, one sentence",
 "note": "facts you will need in later steps (prices, names, dates, what each source said), or empty string. Notes are kept for the whole task; the step list is not",
 "say": "spoken aloud to the user, max 12 words, never repeat something you already said, plain friendly language, no element numbers. Use it on the first step (what you're about to do) and when you learn something new. Otherwise empty string: the user hears silence while you work, do not narrate every click",
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
   {"type":"set","key":"lang|confirm|narrate|model|rate","value":"..."}   // the user changes how you work: lang = en-IN|hi-IN|ta-IN|kn-IN|te-IN; confirm = on|off (off = no yes/no questions before irreversible steps); narrate = on|off (off = only answers and questions are spoken); model = cheap|smart; rate = 0.8-1.6 speech speed. Use done right after if that was all they asked
   {"type":"ask","question":"..."}                         // ask the user when the goal is ambiguous or you need their choice
   {"type":"done","answer":"..."}                          // goal reached: spoken to the user. Answer EVERY part of the question (who AND when AND where…) in one or two short sentences, with the exact facts from the page
 , "risky": true|false }

Rules:
- One action per turn. After it, you will see the new page.
- Research questions ("is X out yet", "what are people saying about Y"): search (https://duckduckgo.com/html/?q=...), open the official source and one or two discussions (e.g. reddit), note what each says with its date, then answer with "done", saying which source said what. Never answer from memory.
- Comparing across sites: note each site's fact as soon as you see it, then go to the next site. Never go back to a site you already have a note for.
- Prefer the fastest route: navigate directly to well-known sites (e.g. https://en.wikipedia.org/wiki/Special:Search?search=...), use the site's search box.
- Continue/Next/Search buttons and adding to a cart are NOT risky. Set "risky": true for anything that spends money, sends or posts something, submits a form, deletes, or books. The user will be asked to confirm.
- Never type passwords, card numbers, CVV or OTPs, even if the user tells you them, and never ask permission to. For a sign-in: use the site's own email/username form (not "Continue with Google/Apple/Facebook"), fill the email or username, press Continue/Next if the password box is on the next page, and once the password box is on screen finish with "done" telling the user the password box is ready and they should type it themselves, because you never handle passwords.
- Elements marked offscreen are fine to click. If what you need is not in the list, scroll or read.
- If an action failed, try a different approach, do not repeat the same failing action.
- Play/Pause buttons toggle: click a play button once, then check page.media. If it still says nothing is playing after two different tries, finish with "done" saying playback did not start (the browser may block protected music) instead of clicking more.
- Cookie or sign-up banners covering the page: close or decline them first (decline non-essential cookies).
- Only use "done" when the CURRENT page proves the goal is achieved (the video page is open and media says playing, the item shows in the cart, the answer is in the page text). Never claim something happened that the page does not show; if unsure, check first.
- When the user only asks what is on the page, answer with "done" right away, summarising the page in plain words.
- Write "say", "question" and "answer" in the user's language: {LANG}. If the goal itself is written in another language (Hindi, Hinglish like "kya", Tamil…), reply in that language instead.`;

// notes and mid-task words ride along on the history array so decide() stays a pure function of its inputs
const io_extra = h => ({ said_meanwhile: h.said || [], notes: h.notes || [] });

export async function decide({ goal, history, snap, settings }) {
  const user = {
    goal,
    ...(io_extra(history)),
    // bulky page_text / screen only matter right after the read/look that produced them
    steps_so_far: history.slice(-10).map((h, k, a) => (k === a.length - 1 ? h : { ...h, page_text: undefined, screen: undefined })),
    page: { url: snap.url, title: snap.title, scroll: snap.scroll, media: snap.media, text: snap.text },
    elements: compact(snap.elements),
  };
  const messages = [
    { role: 'system', content: SYSTEM.replace('{LANG}', settings.langName || 'English') },
    { role: 'user', content: JSON.stringify(user) },
  ];
  const t0 = Date.now();
  try {
    const d = await chat(settings.apiBase, settings.apiKey, settings.model, messages);
    return { ...d, via: `${d.via} ${Date.now() - t0}ms` };
  } catch (e) {
    // a live user can't wait on a flaky provider: one immediate switch to the backup planner
    if (!settings.fallbackKey) throw e;
    const d = await chat(settings.fallbackBase, settings.fallbackKey, settings.fallbackModel, messages);
    return { ...d, via: `fallback ${d.via} ${Date.now() - t0}ms (primary: ${e.message.slice(0, 60)})` };
  }
}

// Any OpenAI-compatible endpoint. Speko's router picks the provider per request and fails over by itself.
async function chat(base = 'https://api.groq.com/openai/v1', key, model = 'llama-3.3-70b-versatile', messages) {
  const speko = base.includes('speko');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, messages, max_tokens: 400,
        // Speko only accepts text response_format and wants reasoning off for voice latency; parseDecision copes with prose around the JSON
        ...(speko ? { reasoning_effort: 'none' } : { temperature: 0.1, response_format: { type: 'json_object' } }),
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return { ...parseDecision(data.choices[0].message.content), via: res.headers.get('speko-provider') ? `speko→${res.headers.get('speko-provider')}/${res.headers.get('speko-model')}` : model };
  } finally {
    clearTimeout(timer);
  }
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
export async function look({ goal, settings, windowId, prompt }) {
  const shot = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 60 });
  // Speko's router is text-only, so vision has its own provider
  const res = await fetch(`${settings.visionBase || settings.apiBase || 'https://api.groq.com/openai/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.visionKey || settings.apiKey}` },
    body: JSON.stringify({
      model: settings.visionModel || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt || `Describe this web page screenshot for someone who cannot see it, in under 120 words. Yellow number tags mark clickable elements: say which number does what, especially icon-only buttons with no text. The user's goal: ${goal}` },
          { type: 'image_url', image_url: { url: shot } },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`vision ${res.status}`);
  return (await res.json()).choices[0].message.content;
}

// JS \b only knows ASCII letters, so Indian-script words get their own alternation without it
export const STOP = /^(stop|cancel|abort|quiet|shut up|ruko|bas)\b|^(रुको|रुकिए|बस|बंद करो|स्टॉप|நிறுத்து|ನಿಲ್ಲಿಸು|ఆపు)/i;

// Our own voice coming back through the mic. Matters most for confirmations: an echoed question must never count as a yes.
export function isEcho(t, said, busy, sinceMs, strict) {
  if (STOP.test(t)) return false;
  // strict = a confirmation is waiting: anything heard while or just after we spoke is discarded
  if (strict && (busy || sinceMs < 1200)) return true; // final transcripts land a moment after the audio stops
  // whole content words only: "the", "now", "what" and substrings ("now" in "known") made real questions look like echo
  const content = x => x.toLowerCase().split(/[^\p{L}\p{M}\p{N}']+/u).filter(w => w.length > 3);
  const saidWords = new Set(content(said));
  const words = content(t);
  const overlap = words.length ? words.filter(w => saidWords.has(w)).length / words.length : 0;
  return words.length >= 2 && overlap > (busy ? 0.5 : 0.6);
}

// the language a request was spoken in, when it isn't the settings language
const SCRIPTS = [[/[\u0900-\u097F]/, 'Hindi'], [/[\u0B80-\u0BFF]/, 'Tamil'], [/[\u0C80-\u0CFF]/, 'Kannada'], [/[\u0C00-\u0C7F]/, 'Telugu']];
const HINGLISH = /\b(kya|hai|hain|ka|ki|ke|ko|pe|par|mein|mujhe|mera|meri|chalao|chala|karo|kar|batao|bata|dikhao|kaise|kab|kahan|kitna|nahi|gaana|gana|wala|wali|aur|abhi|zara)\b/g;
export function goalLang(goal) {
  for (const [re, name] of SCRIPTS) if (re.test(goal)) return name;
  if ((goal.toLowerCase().match(HINGLISH) || []).length >= 3) return 'Hindi (the user spoke Hinglish: reply in simple Hindi, Devanagari script)';
  return null;
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
  // the tab the user is looking at (Nova's home page included)
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || (await chrome.tabs.query({ active: true }))[0];
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
  history.notes = [];
  history.said = io.inbox || []; // the brain pushes anything the user says mid-task here
  const spoken = new Set(); // never say the same line twice in one task
  const seen = {}; // action+page -> times, to catch loops
  for (let step = 1; step <= MAX_STEPS; step++) {
    if (io.aborted()) return io.log('stop', 'Stopped.');
    const tab = await activeTab();
    if (!tab?.id) return io.say("Sorry, I can't find the browser tab.");

    let snap;
    // Nova's home page and browser pages can't be scripted: the planner just navigates away from them
    if (!/^https?:/.test(tab.url || '')) snap = { url: 'new tab', title: 'AccessNull home', scroll: { y: 0, max: 0 }, media: 'nothing is playing', text: 'The AccessNull home page. Nothing to click here: use navigate to open the right site.', elements: [] };
    else try {
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
    io.log('plan', `${d.thought || ''} :: ${JSON.stringify(a)} [${d.via || ''}]`);
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
    if (d.note) history.notes = [...history.notes, d.note].slice(-12);
    const sayKey = (d.say || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
    // confirm=off is the user's own spoken choice ("just do what I say"); secrets above are never negotiable
    const gated = settings.confirm !== 'off' && needsConfirm(a, el);
    // a gated step speaks its line once, inside the question
    if (sayKey && !spoken.has(sayKey) && settings.narrate !== 'off' && !gated && a.type !== 'done' && a.type !== 'ask') io.say(d.say);
    if (sayKey) spoken.add(sayKey);

    if (a.type === 'set') {
      const r = await io.set(a.key, a.value); // saved by the brain; this task honours it from the next step
      Object.assign(settings, r.settings, { showMarks: settings.showMarks });
      io.say(r.msg);
      history.push({ step, action: a, result: r.msg });
      continue;
    }

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

    if (gated) {
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
    const key = `${snap.url}|${JSON.stringify({ ...a, risky: undefined })}`;
    seen[key] = (seen[key] || 0) + 1;
    const loop = seen[key] > 1 ? ` WARNING: you have done exactly this ${seen[key]} times on this page. Do something different, or finish with "done" from your notes.` : '';
    history.push({ step, action: a, result: (result.ok ? result.did : `FAILED: ${result.error}`) + loop, ...(result.text && { page_text: result.text }), ...(result.description && { screen: result.description }) });
    if (['click', 'navigate', 'back'].includes(a.type) || a.submit) await settle(tab.id);
  }
  io.say('That took too many steps, so I stopped. Try a more specific request.');
}
