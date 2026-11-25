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
   {"type":"tab","op":"new"|"switch"|"close","url":"https://...","n":N}   // tabs: open a site in a new tab, switch to tab number N (counting from 1, left to right), close the current tab
   {"type":"read"}                                         // get the full page text when the snapshot text is not enough
   {"type":"look"}                                         // get a description of a screenshot, for unlabeled or visual pages
   {"type":"readaloud"}                                    // read the page's main text aloud to the user, from where they are. Use when they want an article, story or book read to them (navigate to it first)
   {"type":"view","style":["bigger"|"huge"|"contrast"|"dark"|"dyslexia"|"calm"|"focus"|"spacious"|"original"],"keep":"...","save":true|false}   // change how the page LOOKS for this user: style presets, and/or keep only what they describe and hide the rest. save=true when they want this site to always look like this. "original" removes every change
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
- An advert playing before the right video means the goal is reached: press Skip once if it is offered, otherwise finish with "done" (say the video starts after the ad). Never wait around reading the page for an ad to end.
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
    page: { url: snap.url, title: snap.title, scroll: snap.scroll, media: snap.media, text: snap.text, ...(snap.tabs?.length > 1 && { open_tabs: snap.tabs }) },
    elements: compact(snap.elements),
  };
  const messages = [
    { role: 'system', content: SYSTEM.replace('{LANG}', settings.langName || 'English') },
    { role: 'user', content: JSON.stringify(user) },
  ];
  const r = await complete(settings, messages);
  return { ...parseDecision(r.text), via: r.via };
}

// the planner's model with one immediate switch to the backup: a live user can't wait on a flaky provider
export async function complete(settings, messages) {
  const t0 = Date.now();
  try {
    const r = await chat(settings.apiBase, settings.apiKey, settings.model, messages);
    return { ...r, via: `${r.via} ${Date.now() - t0}ms` };
  } catch (e) {
    if (!settings.fallbackKey) throw e;
    const r = await chat(settings.fallbackBase, settings.fallbackKey, settings.fallbackModel, messages);
    return { ...r, via: `fallback ${r.via} ${Date.now() - t0}ms (primary: ${e.message.slice(0, 60)})` };
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
    return { text: data.choices[0].message.content, via: res.headers.get('speko-provider') ? `speko→${res.headers.get('speko-provider')}/${res.headers.get('speko-model')}` : model };
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

// ---------- remodel: restyle the page and keep only what the user wants, remembered per site ----------
export const VIEW_STYLES = ['bigger', 'huge', 'contrast', 'dark', 'dyslexia', 'calm', 'focus', 'spacious'];
const KEEP_PROMPT = `You simplify a web page for a person with a disability. You get what they want to keep, and the page split into numbered blocks (tag, role, heading, a bit of text, position and size, links, images, form fields, sponsored).
Choose the blocks to HIDE so only what they want remains. Anything they name MUST stay: if they mention a search box, keep the block whose fields include it, even if that block also holds a menu. Keep what they need to use it (the main content, its heading). Hide sponsored blocks, ads, banners, sidebars, footers, menus, recommendations and pop-ups unless they asked for them. Blocks are listed top to bottom with their position (x,y width x height). Never hide everything.
Reply with ONLY JSON: {"hide":[block numbers],"say":"one short spoken sentence of what is left, in {LANG}"}`;

export async function remodel(tabId, settings, { style = [], keep = '', save = false, presets, unsave = false }) {
  const tab = await chrome.tabs.get(tabId);
  const host = new URL(tab.url).hostname;
  const cur = (await send(tabId, { type: 'applyView', view: null }).catch(() => null)) || { presets: [], hide: [] };
  let next = { presets: [...cur.presets], hide: [...cur.hide], keep: cur.keep || '' };
  let say = '';
  style = [].concat(style || []);
  if (Array.isArray(presets)) next.presets = presets.filter(k => VIEW_STYLES.includes(k)); // the look sheet sends the full set
  if (style.includes('original')) next = { presets: [], hide: [], keep: '' }, (say = 'Back to the original page.');
  for (const k of style) if (VIEW_STYLES.includes(k) && !next.presets.includes(k)) next.presets.push(k);
  // bigger and huge, dark and contrast: the newer one wins
  if (style.includes('huge')) next.presets = next.presets.filter(k => k !== 'bigger');
  if (style.includes('bigger')) next.presets = next.presets.filter(k => k !== 'huge');
  if (style.includes('contrast')) next.presets = next.presets.filter(k => k !== 'dark');
  if (style.includes('dark')) next.presets = next.presets.filter(k => k !== 'contrast');
  if (keep) {
    const blocks = await send(tabId, { type: 'sections' });
    // one call, and what's left on screen is the whole point: worth the careful model
    const r = await complete({ ...settings, model: settings.smartModel || settings.model }, [
      { role: 'system', content: KEEP_PROMPT.replace('{LANG}', settings.langName || 'English') },
      { role: 'user', content: JSON.stringify({ keep, page: tab.title, blocks }) },
    ]);
    const m = r.text.match(/\{[\s\S]*\}/);
    const d = m ? JSON.parse(m[0]) : { hide: [] };
    // code has the last word on what the user named: a block with a field they mentioned stays, "sponsored" goes by its flag
    const named = b => (b.fields || []).some(f => f.toLowerCase().split(/\W+/).some(w => w.length > 3 && keep.toLowerCase().includes(w)));
    const noAds = /sponsor|\bads?\b|advert/i.test(keep);
    let hideN = new Set((d.hide || []).filter(n => !named(blocks.find(b => b.n === n) || {})));
    if (noAds) for (const b of blocks) if (b.sponsored && !named(b)) hideN.add(b.n);
    const hide = [...hideN].map(n => blocks.find(b => b.n === n)?.sel).filter(Boolean);
    if (globalThis.process?.env?.NOVA_DEBUG) console.log('[remodel]', JSON.stringify({ blocks, d, via: r.via }));
    if (hide.length >= blocks.length) return { ok: false, say: "I couldn't tell what to keep on this page." };
    next.hide = [...new Set([...next.hide, ...hide])];
    next.keep = keep;
    say = d.say || `I hid ${hide.length} parts of the page.`;
  }
  await send(tabId, { type: 'applyView', view: next });
  if (!say) say = next.presets.length ? `Done. The page is now ${next.presets.join(', ')}.` : 'Done.';
  const { views = {} } = await chrome.storage.local.get('views');
  if (save) {
    // remember the intent, not this page's blocks: the next Amazon page has different cards
    views[host] = { presets: next.presets, keep: next.keep };
    await chrome.storage.local.set({ views });
    say += ` I'll always show ${host.replace(/^www\./, '')} like this for you.`;
  } else if ((unsave || style.includes('original')) && views[host]) {
    delete views[host];
    await chrome.storage.local.set({ views });
  }
  return { ok: true, say, view: next };
}

// Spoken restyle requests answered without the planner. null = not a view command.
export function viewCommand(t) {
  if (t.split(/\s+/).length > 14) return null;
  // a task that happens to say "bigger" or "dark" ("find a bigger bottle") is not a restyle
  const task = /\b(find|search|buy|add|order|play|book|send|cart|price|cheapest|watch)\b/.test(t) && !/^(?:please )?(keep only|only keep|only show|show (me )?only|just show|leave only|simplify|clean up|declutter)/.test(t);
  if (task) return null;
  const v = { style: [], keep: '', save: false };
  if (/^((show|go back to|back to|reset to|restore)( me)? (the )?(original|normal)( page| look| view| site)?|(reset|undo)( the)? (page|view|changes|look|design))$/.test(t)) return { ...v, style: ['original'] };
  if (/\b(remember (this|that)|save (this|that)( look| view| layout| style)?|always show (this|it|this site|this page|[a-z.]+) (like this|this way)|keep it like this)\b/.test(t)) v.save = true;
  const keep = t.match(/^(?:please )?(?:keep only|only keep|only show|show (?:me )?only|just show(?: me)?|leave only)\s+(.+?)(?:,? and (?:remember|save|always).*)?$/);
  if (keep) v.keep = keep[1];
  else if (/^(?:please )?(simplify|clean up|declutter|tidy up|strip down|remove (the )?clutter)\b/.test(t)) v.keep = t.replace(/^(?:please )?(simplify|clean up|declutter|tidy up|strip down|remove (the )?clutter)( this| the)?( page| site)?/, '').replace(/^\s*(to|so|and)\b/, '').trim() || 'the main content only';
  const S = [['huge', /\b((much|even|really|very|a lot) (bigger|larger)|huge|giant) (text|font|letters)?|\bhuge\b/], ['bigger', /\b(bigger|larger) (text|font|letters|words)\b|\b(make|increase)( the)? (text|font|it|everything|page|letters)( a bit)? (bigger|larger)\b|\bzoom in\b|^(bigger|larger)( please)?$/],
    ['dark', /\bdark (mode|theme)\b|\bmake it dark\b/], ['contrast', /\b(high|more|better) contrast\b/], ['dyslexia', /\bdyslexi/],
    ['calm', /\b(hide|remove|no|without)( the| all)? (images|pictures|photos|ads|adverts|animations|videos)\b|\bcalm (mode|down the page)\b/],
    ['spacious', /\b(more space|spacious|spread (it )?out)\b/], ['focus', /\b(focus (ring|outline)|show (the )?focus)\b/]];
  for (const [k, re] of S) if (re.test(t) && !(k === 'bigger' && v.style.includes('huge'))) v.style.push(k);
  return v.style.length || v.keep || v.save ? v : null;
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

    snap.tabs = (await chrome.tabs.query({ currentWindow: true }).catch(() => [])).map((t, k) => `${k + 1}${t.active ? ' (this one)' : ''}: ${(t.title || t.url || '').slice(0, 50)}`);
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
    // narration only on steps that move things forward; reading, scrolling and looking happen quietly
    const progress = ['navigate', 'click', 'type', 'fill', 'select', 'back', 'readaloud', 'view'].includes(a.type);
    if (sayKey && !spoken.has(sayKey) && settings.narrate !== 'off' && !gated && progress) io.say(d.say);
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
      } else if (a.type === 'tab') {
        const all = await chrome.tabs.query({ currentWindow: true });
        if (a.op === 'new') await chrome.tabs.create({ url: a.url || 'about:blank' }), (result = { ok: true, did: `opened ${a.url || 'a new tab'} in a new tab` });
        else if (a.op === 'close') await chrome.tabs.remove(tab.id), (result = { ok: true, did: 'closed the tab' });
        else { const t = all[(a.n || 1) - 1]; result = t ? (await chrome.tabs.update(t.id, { active: true }), { ok: true, did: `switched to tab ${a.n}: ${t.title}` }) : { ok: false, error: `there are only ${all.length} tabs` }; }
      } else if (a.type === 'view') {
        const r = await remodel(tab.id, settings, a);
        result = { ok: r.ok, did: r.say, error: r.say };
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
    if (a.type === 'tab') await settle((await activeTab()).id);
  }
  io.say('That took too many steps, so I stopped. Try a more specific request.');
}
