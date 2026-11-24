# CLAUDE.md

Repo has two projects. **Work happens in `extension/`** unless told otherwise.

- `extension/`: **AccessNull**, the browser agent. wHACKiest 2026 Track 2 entry (Team null: A M Armaan, Pooja Shree Ravichandar). Chrome/Edge MV3, plain JS ES modules, **no build step, no dependencies**. Load unpacked.
- `src/` + root Vite config: **AccessPoint**, older head-pointer React app (MediaPipe). Reference for porting the head pointer. Docs in `docs/ACCESSPOINT.md`, `SETUP.md`.

## Map
- `extension/agent.js`: loop, planner + vision calls (Groq), safety gate (`IRREVERSIBLE`, `needsConfirm`), offline matcher (`matchLabel`), snapshot compaction, tab plumbing
- `extension/content.js`: snapshot, marks, actions, React-safe `setValue`, `isSecret`. Must stay stateless.
- `extension/sidepanel.js`: voice routing, quick commands, confirm/ask UI, settings (chrome.storage.local)
- `extension/voice.js`: ElevenLabs TTS + browser fallback, speech recognition
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
- The agent loop lives in the side panel because the content script dies on navigation and the MV3 worker dies when idle.
- Keep the prompt compact (Groq free-tier tokens-per-minute limits).
- Commits: no AI attribution trailers.

## Status (update as you go)
- 24 Nov 2026: v2 agent extension built and checked (unit + page self-check + loaded in Edge, snapshot on live Wikipedia). Not yet tested end to end with real Groq/ElevenLabs keys.
- Ideathon deliverables (PPT `TeamNull_Track2`, video, Devnovate) are tracked in `C:\Users\Cleo\Desktop\hackathons\wHACKiest\PLAN.md`.
