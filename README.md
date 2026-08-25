# AccessPoint 🎯

**A forehead-controlled web interface for people with limb disabilities.**

AccessPoint lets someone navigate a full web application — menus, forms, a chat
assistant — using nothing but head movement tracked through a standard webcam.
No special hardware, no installed drivers. It runs in the browser.

Built for the *AI for Disability* hackathon category.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-00A67E)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Run it

```bash
git clone https://github.com/Kukyos/AccessNull.git
cd AccessNull
npm install && npm run dev
```

Open `http://localhost:5173` and grant camera access when prompted.

**No webcam?** Press `D` for demo mode — every feature works with the mouse.

Requires Node.js 20.19+ (or 22.12+) and a Chromium-based browser.
In production the camera API requires HTTPS; `localhost` is exempt.

---

## How the interaction works

| Action | Mechanism |
|---|---|
| Move cursor | MediaPipe Face Mesh tracks the forehead landmark; position maps to screen coordinates |
| Click | Dwell for 2s over a target (radial progress indicator), **or** blink |
| Calibrate | Trace an on-screen pattern with your forehead — sets per-user sensitivity |
| Speak / listen | Web Speech API for STT and TTS |

## What's in it

- **Forehead cursor** — webcam head tracking, no hardware
- **Dwell + blink clicking** — two independent selection methods
- **Pattern calibration** — secure, personalised setup via forehead-traced patterns
- **Multilingual assistant** — voice-capable chatbot for medical and accessibility queries
- **Accessible navigation** — prescriptions, campus accessibility info, assistance requests
- **High-contrast healthcare UI** — tuned for clinical environments

## Stack

React 19 · TypeScript · Vite · MediaPipe Face Mesh · Tailwind CSS · Web Speech API

## Layout

```
src/
├── components/
│   ├── Camera/     webcam feed + frame pipeline
│   ├── Cursor/     forehead-driven pointer & dwell indicator
│   ├── Menu/       primary navigation
│   └── Chat/       assistant UI
├── hooks/          tracking, calibration, speech
├── utils/          landmark smoothing, coordinate mapping
└── types/
```

See [SETUP.md](./SETUP.md) for detailed setup.

## Who it's for

Amputees and people with limited limb mobility; medical facilities needing
hands-free patient interaction; campus accessibility services; rehabilitation
centres.

## Contributing

Issues and PRs welcome.

## License

MIT — see [LICENSE](./LICENSE).
