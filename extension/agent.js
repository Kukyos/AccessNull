// AccessNull — the agent loop. Observe (snapshot) → decide (LLM) → gate (safety) → act → repeat.
// Runs in the side panel, so it survives page navigations that wipe the content script.

export const MAX_STEPS = 20;

// Anything matching this needs a spoken "yes" first, whatever the model says. Code-enforced, not prompt-enforced.
export const IRREVERSIBLE =
  /\b(pay|place (your )?order|buy|purchase|checkout|check out|submit|send|delete|remove|confirm|book|transfer|subscribe|sign up|register|post|publish|unsubscribe|cancel (my |the )?(order|subscription|booking))\b/i;

export function needsConfirm(action, el) {
  if (action.risky) return true;
  return action.type === 'click' && !!el && IRREVERSIBLE.test(el.label || '');
}

const SYSTEM = `You are AccessNull, a web agent for blind, low-vision and motor-impaired people. The user cannot see or use a mouse. You act on the real web page on their behalf and keep them informed by voice.

Each turn you get: the user's goal, the steps taken so far, the current page (url, title, scroll, visible text), and its interactive elements, one per line: N role:type "label" =current value [options] (offscreen). N is the element number you act on.

Reply with ONLY one JSON object:
{"thought": "your private reasoning, one sentence",
 "say": "what to tell the user right now, spoken aloud, max 20 words, plain friendly language, no element numbers",
 "action": ONE OF
   {"type":"click","i":N}
   {"type":"type","i":N,"text":"...","submit":true|false}   // submit=true presses Enter (good for search boxes)
   {"type":"select","i":N,"text":"option text"}
   {"type":"scroll","dir":"down"|"up"|"top"|"bottom"}
   {"type":"navigate","url":"https://..."}                  // go straight to a site you know
   {"type":"back"}
   {"type":"read"}                                         // get the full page text when the snapshot text is not enough
   {"type":"look"}                                         // get a description of a screenshot, for unlabeled or visual pages
   {"type":"ask","question":"..."}                         // ask the user when the goal is ambiguous or you need their choice
   {"type":"done","answer":"..."}                          // goal reached: answer is spoken to the user, be concise and complete
 , "risky": true|false }

Rules:
- One action per turn. After it, you will see the new page.
- Prefer the fastest route: navigate directly to well-known sites (e.g. https://en.wikipedia.org/wiki/Special:Search?search=...), use the site's search box.
- Set "risky": true for anything that spends money, sends or posts something, submits a form, deletes, or books. The user will be asked to confirm.
- Never type passwords, card numbers, CVV or OTPs. If needed, use "ask" to tell the user to enter it themselves.
- Elements marked offscreen are fine to click. If what you need is not in the list, scroll or read.
- If an action failed, try a different approach, do not repeat the same failing action.
- When the user only asks what is on the page, answer with "done" right away, summarising the page in plain words.
- Write "say", "question" and "answer" in the user's language: {LANG}.`;

export async function decide({ goal, history, snap, settings }) {
  const user = {
    goal,
    // bulky page_text / screen only matter right after the read/look that produced them
    steps_so_far: history.slice(-10).map((h, k, a) => (k === a.length - 1 ? h : { ...h, page_text: undefined, screen: undefined })),
    page: { url: snap.url, title: snap.title, scroll: snap.scroll, text: snap.text },
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
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.groqKey}` },
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
  if (!d.action || typeof d.action.type !== 'string') throw new Error('AI reply had no action');
  if (d.risky != null && d.action.risky == null) d.action.risky = !!d.risky;
  return d;
}

// Vision: screenshot of the tab (with the numbered marks drawn on it) → plain description.
export async function look({ goal, settings, windowId }) {
  const shot = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 60 });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.groqKey}` },
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
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
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
  for (let step = 1; step <= MAX_STEPS; step++) {
    if (io.aborted()) return io.log('stop', 'Stopped.');
    const tab = await activeTab();
    if (!tab?.id || /^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
      // can't script browser pages: start the agent from a real site
      await chrome.tabs.update(tab.id, { url: 'https://www.google.com' });
      await settle(tab.id);
      continue;
    }

    let snap;
    try {
      snap = await send(tab.id, { type: 'snapshot', marks: true });
    } catch (e) {
      io.log('error', `Can't read this page (${e.message}).`);
      return io.say("Sorry, I can't read this page.");
    }

    let d;
    try {
      io.log('think', `Step ${step}: thinking…`);
      d = await decide({ goal, history, snap, settings });
    } catch (e) {
      io.log('error', e.message);
      return io.say('Sorry, I could not reach the AI. Check the key in settings.');
    }
    if (io.aborted()) return io.log('stop', 'Stopped.');

    const a = d.action;
    const el = a.i != null ? snap.elements.find(x => x.i === a.i) : null;
    io.log('plan', `${d.thought || ''}`);
    if (d.say && a.type !== 'done' && a.type !== 'ask') io.say(d.say);

    if (a.type === 'done') {
      io.log('done', a.answer || d.say || 'Done.');
      await send(tab.id, { type: 'clearMarks' }).catch(() => {});
      return io.say(a.answer || d.say || 'Done.', { wait: true });
    }

    if (a.type === 'ask') {
      const reply = await io.ask(a.question || d.say);
      history.push({ step, action: a, result: `user replied: ${reply}` });
      continue;
    }

    if (needsConfirm(a, el)) {
      const what = el ? `${a.type} "${el.label}"` : a.type;
      const ok = await io.confirm(d.say ? `${d.say} Should I go ahead?` : `I'm about to ${what}. Should I go ahead?`);
      if (!ok) {
        history.push({ step, action: a, result: 'user said NO, do not do this; ask what they want instead or finish' });
        io.log('stop', 'Okay, not doing that.');
        continue;
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
        const desc = await look({ goal, settings, windowId: tab.windowId });
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
