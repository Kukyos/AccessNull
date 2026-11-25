# CLAUDE.md

Repo has three projects. **`nova/` (the AccessNull browser) + `extension/` (Nova's brain, shared)** are the live work.

- `extension/`: **AccessNull**, the browser agent. wHACKiest 2026 Track 2 entry (Team null: A M Armaan, Pooja Shree Ravichandar). Chrome/Edge MV3, plain JS ES modules, **no build step, no dependencies**. Load unpacked.
- `nova/`: **AccessNull browser**, Electron 45 shell built around Nova. `main.js` gives the extension's `background.js`/`agent.js` a `chrome` shim (tabs, storage, messaging, capture), Speko streaming speech-to-text (ears) and ElevenLabs (voice). `page-preload.cjs` loads `content.js` into every page. `shell.*` = tabs, toolbar, Nova's caption line, sheets. Run `npm start` in `nova/`.
- `src/` + root Vite config: **AccessPoint**, older head-pointer React app (MediaPipe). Reference for porting the head pointer. Docs in `docs/ACCESSPOINT.md`, `SETUP.md`.

## Map
- `extension/agent.js`: loop, planner + vision calls (Groq), safety gate (`IRREVERSIBLE`, `needsConfirm`), offline matcher (`matchLabel`), snapshot compaction, tab plumbing
- `extension/background.js`: the brain in the service worker: routing what was heard, quick commands, confirm/ask, pill state, `trace` in storage.session. `self.__accessnull` exposes hooks for DevTools / the demo recorder.
- `extension/content.js`: glass pill (shadow DOM), speech recognition, snapshot, marks, actions (incl. batch `fill`), React-safe `setValue`, `isSecret`. Must stay stateless (asks the brain with `hello` on load).
- `extension/offscreen.js` + `voice.js`: voice out (ElevenLabs → browser fallback)
- `extension/options.*`: settings page. `extension/keys.local.json` (git-ignored) holds default keys.
- `docs/ARCHITECTURE.md`: how it works. Update it when behaviour changes.
- `docs/ROADMAP.md`: done / hack day / later. Tick items as they land.

## Checks (run before committing)
- `cd extension && node test.mjs`: matcher, gate, parser, compact format
- `cd extension && python -m http.server 8765` → open `http://localhost:8765/test.html`, title must be `ALL PASS`
- `node --check extension/*.js`
- Loading the real extension headed: playwright-core + Edge with `--load-extension` (Chrome stable no longer honours that flag)

## Rules
- Safety gate and secret refusal are enforced in code. Never move them into the prompt only.
- Keys live in `chrome.storage.local`, never in files. Groq keys start `gsk_`. Grep before every push. An old Groq key is in this repo's git history (pre-Nov 2026); it must be revoked, not "removed".
- The agent loop lives in the service worker (kept alive with a 20 s ping during a task) because the content script dies on navigation. No side panel: users only ever see the glass pill.
- Keep the prompt compact (Groq free-tier tokens-per-minute limits).
- Commits: no AI attribution trailers.

## Status (update as you go)
- 26 Nov 2026: AccessNull browser (`nova/`) built around the assistant Nova. Planner via Speko (Claude Haiku 5.5, Sonnet 5 on request), page remodel with per-site memory, settings by voice, tab actions, transcripts on disk. Live-tested via Playwright `_electron` (harness in the wHACKiest workspace, `video/tools/recorder/nova-run.cjs`).
- 24 Nov 2026 night: read aloud with highlight, numbers only on demand, safe-list for add-to-cart/continue, snapshot retries, typing into div textboxes fixed. The demo film and deck are built outside this repo: see `C:/Users/Cleo/Desktop/hackathons/wHACKiest/HANDOFF.md`. Known site limits: Spotify playback fails in automated Edge (DRM); Swiggy's location modal loops the agent.
- 24 Nov 2026 afternoon: v2.1, side panel replaced by the glass pill + service-worker brain. Tested live on Wikipedia, YouTube, Amazon.in (gate at checkout), Netflix (password handover). Provider is any OpenAI-compatible API (airouter.in gpt-4.1-mini during the ideathon).
- 24 Nov 2026: v2 agent extension built and checked (unit + page self-check + loaded in Edge, snapshot on live Wikipedia). Not yet tested end to end with real Groq/ElevenLabs keys.
- Ideathon deliverables (PPT `TeamNull_Track2`, video, Devnovate) are tracked in `C:\Users\Cleo\Desktop\hackathons\wHACKiest\PLAN.md`.
