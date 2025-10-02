# AccessPoint 🎯# React + TypeScript + Vite



**Forehead-Controlled Accessible Interface for Amputees**This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.



A revolutionary web application that enables individuals with limb disabilities to interact with digital interfaces using only their head movements. Built for the AI for Disability hackathon category.Currently, two official plugins are available:



## 🌟 Features- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh

- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- **Forehead Cursor Control**: Navigate using head movements tracked via webcam

- **Dwell-Time Clicking**: Hover for 2 seconds to click (with visual progress indicator)## React Compiler

- **Blink Detection**: Alternative clicking method using eye blinks

- **Pattern Calibration**: Secure and personalized setup with forehead-traced patternsThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

- **Multilingual Medical Assistant**: AI chatbot with voice support for medical and accessibility queries

- **Accessible Navigation**: View prescriptions, campus accessibility info, and request assistance## Expanding the ESLint configuration

- **Healthcare UI**: Clean white and red color scheme optimized for medical environments

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

## 🚀 Quick Start

```js

### Prerequisitesexport default defineConfig([

  globalIgnores(['dist']),

- Node.js 20.19.0+ or 22.12.0+  {

- npm 10.0.0+    files: ['**/*.{ts,tsx}'],

- Webcam    extends: [

- Modern browser (Chrome/Edge recommended)      // Other configs...



### Installation      // Remove tseslint.configs.recommended and replace with this

      tseslint.configs.recommendedTypeChecked,

```bash      // Alternatively, use this for stricter rules

# Clone the repository      tseslint.configs.strictTypeChecked,

git clone <your-repo-url>      // Optionally, add this for stylistic rules

cd accesspoint      tseslint.configs.stylisticTypeChecked,



# Install dependencies      // Other configs...

npm install    ],

    languageOptions: {

# Start development server      parserOptions: {

npm run dev        project: ['./tsconfig.node.json', './tsconfig.app.json'],

```        tsconfigRootDir: import.meta.dirname,

      },

Visit `http://localhost:5173` and grant camera permissions when prompted.      // other options...

    },

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**  },

])

## 🎯 Use Cases```



- **Amputees**: Control digital interfaces without traditional input devicesYou can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

- **Medical Facilities**: Accessible patient interaction systems

- **Campus Accessibility**: Navigate university resources hands-free```js

- **Rehabilitation Centers**: Assistive technology for patients// eslint.config.js

import reactX from 'eslint-plugin-react-x'

## 🛠️ Technology Stackimport reactDom from 'eslint-plugin-react-dom'



- **Frontend**: React 19 + TypeScript + Viteexport default defineConfig([

- **Face Tracking**: MediaPipe Face Mesh (Google)  globalIgnores(['dist']),

- **Styling**: Tailwind CSS  {

- **AI Assistant**: Custom multilingual chatbot    files: ['**/*.{ts,tsx}'],

- **Voice**: Web Speech API (TTS/STT)    extends: [

      // Other configs...

## 📁 Project Structure      // Enable lint rules for React

      reactX.configs['recommended-typescript'],

```      // Enable lint rules for React DOM

accesspoint/      reactDom.configs.recommended,

├── src/    ],

│   ├── components/       # UI components    languageOptions: {

│   │   ├── Camera/       # Webcam feed      parserOptions: {

│   │   ├── Cursor/       # Forehead cursor        project: ['./tsconfig.node.json', './tsconfig.app.json'],

│   │   ├── Menu/         # Main navigation        tsconfigRootDir: import.meta.dirname,

│   │   └── Chat/         # AI assistant      },

│   ├── hooks/            # Custom React hooks      // other options...

│   ├── utils/            # Helper functions    },

│   ├── types/            # TypeScript definitions  },

│   └── App.tsx           # Main application])

├── public/               # Static assets```

└── SETUP.md              # Detailed setup guide
```

## 🎮 How to Use

1. **Grant Camera Permission**: Allow browser access to webcam
2. **Calibration**: Trace the pattern with your forehead to calibrate sensitivity
3. **Navigate**: Move your head to control the cursor
4. **Click**: Hover over buttons for 2 seconds or blink to click
5. **Interact**: Access medical info, chat with AI assistant, explore campus accessibility

## 🧪 Demo Mode

For hackathon presentations without camera:
- Press `D` to enable demo mode with mouse control
- All features remain functional

## 🤝 Contributing

This project was built for the AI for Disability hackathon. Contributions are welcome!

## 📄 License

MIT

## 👥 Team

Built with ❤️ for making technology accessible to everyone

---

**Note**: This project requires HTTPS in production due to camera API requirements. Use `localhost` for development.
