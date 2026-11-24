# AccessNull architecture

## Components

| Piece | File | Job |
|---|---|---|
| Service worker | `extension/background.js` | Opens the side panel on icon click; forwards Alt+Shift+A to it. Holds no state (MV3 kills it when idle). |
| Side panel | `extension/sidepanel.{html,css,js}` | The app. Mic, routing of what the user says, confirmation UI, live log, settings. Lives across page navigations, which is why the agent runs here. |
| Agent | `extension/agent.js` | The loop, the LLM calls (planner + vision), the safety gate, the offline matcher, tab plumbing. |
| Voice | `extension/voice.js` | Speech in (Web Speech API, continuous, auto-restart) and out (ElevenLabs → browser TTS fallback), queued so lines never overlap. |
| Content script | `extension/content.js` | Injected into every page. Snapshot, numbered marks overlay, actions. Stateless: rebuilt on every page load. |
| Mic grant | `extension/mic.{html,js}` | Side panels can't show the mic permission prompt; this tab asks once for the extension origin. |

## The loop (`agent.run`)

```
for step in 1..20:
  snap   = content.snapshot()            # url, title, scroll, ~3.5k chars of text, numbered elements (marks drawn)
  d      = planner(goal, last 10 steps, snap)   # JSON: {thought, say, action, risky}
  narrate(d.say)
  done?  → speak answer, stop
  ask?   → speak question, wait for the user's reply (voice or typed), continue
  gate:  needsConfirm(action, element)  → speak, wait for yes/no
  act:   click | type | select | scroll | navigate | back | read (full text) | look (vision)
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

## Safety

- **Gate in code**: `IRREVERSIBLE` regex on the target element's label (pay, order, buy, checkout, submit, send, delete, book, transfer, subscribe, post…) or `risky: true` from the model → spoken confirmation. Either one triggers it.
- **Secrets**: `content.isSecret` refuses typing into password / card / CVV / OTP fields, whatever the model asks.
- **Stop**: saying "stop" (also "ruko", "bas"), Esc, or the Stop button aborts the loop and cuts the voice.
- **Echo**: while AccessNull is speaking, recognised speech is ignored unless it's "stop".

## How elements are identified

1. **Instant path, no AI**: "click/press/open X" → `matchLabel`: canonical synonyms (log in = sign in, basket = cart…), word overlap, one typo allowed for words of 5+ letters. ≥60% match wins.
2. **Planner path**: anything else, or an instant command that didn't match → the LLM chooses an element number from the snapshot list, tolerating paraphrase and recognition errors.
3. **Vision path**: when labels are missing (icon-only buttons, canvas), `look` screenshots the tab with the numbers drawn on and a vision model says which number does what.

Labels come from, in order: aria-label, aria-labelledby, `<label for>`, button value, placeholder, wrapping `<label>`, title, alt, child `<img alt>`, text, name.

## Typing on React/Vue sites

Frameworks track an input's value through the prototype setter, so `el.value = x` is silently ignored. `content.setValue` calls the native `HTMLInputElement.prototype` setter, then fires `input` and `change`. Covered by `test.html`.

## Known limits

- iframes and shadow DOM aren't walked yet.
- Pages that block extensions (chrome://, the Web Store) can't be scripted; the agent jumps to google.com.
- Web Speech recognition sends audio to the browser vendor's cloud. Moving to ElevenLabs Scribe is on the roadmap.
