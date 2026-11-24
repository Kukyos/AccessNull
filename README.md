# AccessNull

**A web agent for people who can't see the screen or use a mouse.**

Say what you want done: *"find the cheapest steel water bottle and add it to the cart"*, *"what's on this page?"*, *"fill this form with my details"*. AccessNull plans the steps, does them on the real website, and tells you what's happening in a natural voice. Before anything that can't be undone (paying, sending, submitting, deleting) it stops and asks you out loud.

Built for **wHACKiest 2026 · Track 2: Beyond the Browser** by Team null.

## Why

Screen readers make you walk a page one element at a time. Voice-control tools make you say each button's exact label. The new agentic browsers are built for sighted power users, mostly in English. AccessNull starts from the user who can't see the page or hold a mouse and gives them the whole web back with one sentence.

## What it does

| | |
|---|---|
| **Goal mode** | Observe → decide → act loop on the live page. Multi-step tasks across navigations, narrated step by step. |
| **Spoken confirmation gate** | Pay / order / send / submit / delete need a spoken "yes". Enforced in code, not left to the model. |
| **Never touches secrets** | Refuses to type into password, card, CVV or OTP fields; asks the user to do it. |
| **Numbered marks** | Every clickable element gets a yellow number on screen: *"click 7"* works on any site. |
| **Instant commands, no AI** | *"click sign in"*, *"scroll down"*, *"go back"* are matched locally (synonyms + typo tolerance), with no network round trip. |
| **Vision fallback** | For icon-only buttons and visual pages, a vision model looks at a screenshot (with the numbers drawn on) and explains what's what. |
| **Natural voice** | ElevenLabs Flash v2.5 narration; browser voice as fallback. |
| **Indian languages** | English, Hindi, Tamil, Kannada, Telugu for listening and replies. |
| **Hands-free** | Alt+Shift+A toggles listening. Head-pointer control comes from [AccessPoint](docs/ACCESSPOINT.md) (this repo's `src/`). |

## Try it

1. `chrome://extensions` (or `edge://extensions`) → **Developer mode** → **Load unpacked** → pick the [`extension/`](extension) folder.
2. Click the AccessNull icon. The side panel opens.
3. **Settings**: paste a Groq API key (free at console.groq.com). Optional: an ElevenLabs key for the natural voice.
4. Press **Start listening** (the first time, a tab asks for microphone access) and speak. Or type a request.

Self-checks: `cd extension && node test.mjs` (agent logic) and open `extension/test.html` over http (page actions).

## How it works

```
 you speak ──► Side panel (agent loop, mic, voice)  ──► Groq: planner LLM + vision model
                    │   ▲                              ElevenLabs: speech
        snapshot /  │   │ numbered elements, page text
        actions     ▼   │
               Content script on the page (marks, click, type, select, scroll)
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## Repo layout

```
extension/   AccessNull: the browser agent (Chrome/Edge MV3, plain JS, no build step)
src/         AccessPoint: head-pointer web app (React + MediaPipe), see docs/ACCESSPOINT.md
docs/        architecture, roadmap, AccessPoint docs
```

## Team null

A M Armaan · Pooja Shree Ravichandar



MIT licensed, see [LICENSE](LICENSE).
