# AccessNull architecture

## Components

| Piece | File | Job |
|---|---|---|
| Brain (service worker) | `extension/background.js` | Routes what the user said (stop / yes-no / answers / instant commands / new task), runs the agent loop, drives the pill, keeps itself alive during a task. Survives page navigations, which is why the loop lives here. |
| Agent | `extension/agent.js` | The loop, planner + vision calls (any OpenAI-compatible API), the safety gate, secret-field handover, echo guard, offline matcher, tab plumbing. |
| Page (content script) | `extension/content.js` | The glass pill (shadow DOM), speech recognition, snapshot, numbered marks, actions (click, type, fill, select, scroll, read). Rebuilt on every page load; asks the brain for the current state with `hello` and carries on. |
| Voice out | `extension/offscreen.{html,js}`, `extension/voice.js` | Offscreen document, because a service worker can't play audio and page audio would cut on navigation. ElevenLabs Flash v2.5, browser voice fallback, queued. |
| Settings | `extension/options.{html,css,js}` | Keys, voice, language, models. Defaults come from `keys.local.json` (git-ignored). |

## The loop (`agent.run`)

```
for step in 1..20:
  snap   = content.snapshot()            # url, title, scroll, ~3.5k chars of text, numbered elements (marks drawn)
  d      = planner(goal, last 10 steps, snap)   # JSON: {thought, say, action, risky}
  narrate(d.say)
  done?  → speak answer, stop
  ask?   → speak question, wait for the user's reply (voice or typed), continue
  gate:  needsConfirm(action, element)  → speak, wait for yes/no
  act:   click | type | fill | select | scroll | navigate | back | read (full text) | look (vision) | readaloud (hand over to read-aloud)
  settle: wait for tab load if the action can navigate
```

### Snapshot format sent to the model
One line per element, in-view first, capped at 140:
```
2 button "Search"
7 input:email "Email" ="a@b.c"
12 select "Size" [S|M|L] (offscreen)
```
About three times cheaper in tokens than JSON objects, which matters on Groq's free-tier tokens-per-minute limit.

## Read aloud

`content.readable()` collects headings, paragraphs and list items in the main content from the current viewport down. The brain speaks them one at a time (waiting for each line to finish), sending `highlight` so a soft yellow wash follows along and scrolls into view. It pauses every 6 blocks ("say keep reading"). "Stop" cancels via a token, and "read it to me" after scrolling restarts from the new position.

## Numbers

Numbers are hidden by default; the agent works from the snapshot list without drawing them. "Show numbers" draws them (and the agent keeps them on during a task); the vision fallback draws them only for the instant it takes its screenshot.

## Safety

- **Gate in code**: `IRREVERSIBLE` regex on the target element's label (pay, order, buy, checkout, submit, send, delete, book, transfer, subscribe, post…) or `risky: true` from the model → spoken confirmation. Either one triggers it.
- **Secrets**: `content.isSecret` refuses typing into password / card / CVV / OTP fields, whatever the model asks.
- **Stop**: saying "stop" (also "ruko", "bas"), Esc, or the Stop button aborts the loop and cuts the voice.
- **Echo guard** (`isEcho`): the mic hears AccessNull's own voice. While a confirmation is waiting, anything heard during or within 1.2 s after its speech is discarded, so an echoed question can never count as "yes". Otherwise, phrases that mostly repeat its last line are dropped. "Stop" always gets through.
- **A "no" ends the task.** The agent never re-asks the same irreversible step in another form.
- **Secret handover happens before narration**: an attempt to type into a password/card/OTP input ends the task with "please type it yourself", so the agent never even says it's typing a password.
- **No surprise tabs**: links that would open a new tab open in the same tab.
- **Done must be proven**: the snapshot reports whether media is playing, and the prompt only allows "done" when the page shows the goal achieved.

## How elements are identified

1. **Instant path, no AI**: "click/press/open X" → `matchLabel`: canonical synonyms (log in = sign in, basket = cart…), word overlap, one typo allowed for words of 5+ letters. ≥60% match wins.
2. **Planner path**: anything else, or an instant command that didn't match → the LLM chooses an element number from the snapshot list, tolerating paraphrase and recognition errors.
3. **Vision path**: when labels are missing (icon-only buttons, canvas), `look` screenshots the tab with the numbers drawn on and a vision model says which number does what.

Labels come from, in order: aria-label, aria-labelledby, `<label for>`, button value, placeholder, wrapping `<label>`, title, alt, child `<img alt>`, text, name.

## Typing on React/Vue sites

Frameworks track an input's value through the prototype setter, so `el.value = x` is silently ignored. `content.setValue` calls the native `HTMLInputElement.prototype` setter, then fires `input` and `change`. Covered by `test.html`.

## Known limits

- iframes and shadow DOM aren't walked yet.
- Pages that block extensions (chrome://, the Web Store) can't be scripted; the agent jumps to duckduckgo.com.
- Speech recognition runs in the page, so the browser asks for the mic once per site. ElevenLabs Scribe in the offscreen document removes that (roadmap).
- Web Speech recognition sends audio to the browser vendor's cloud. Moving to ElevenLabs Scribe is on the roadmap.
