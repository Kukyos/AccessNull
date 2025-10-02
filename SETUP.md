# AccessPoint - Setup Guide

## System Requirements

- **Node.js**: Version 20.19.0 or higher (or 22.12.0+)
- **npm**: Version 10.0.0 or higher
- **Webcam**: Required for forehead tracking
- **Modern Browser**: Chrome/Edge recommended for best MediaPipe performance

## Installation Steps

### 1. Check Node.js Version

```bash
node --version
```

If you need to upgrade Node.js:
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **macOS/Linux with nvm**: 
  ```bash
  nvm install 20.19.0
  nvm use 20.19.0
  ```

### 2. Clone Repository

```bash
git clone <your-repo-url>
cd accesspoint
```

### 3. Install Dependencies

```bash
npm install
```

This will install:
- React 19 with TypeScript
- Vite (build tool)
- MediaPipe Tasks Vision (face tracking)
- Tailwind CSS (styling)

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

**Important**: You'll need to grant camera permissions when prompted by your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Requirements

### Required Permissions
- **Camera Access**: Required for forehead tracking
- **Microphone Access**: Optional (for future voice input features)

### Recommended Browsers
- Chrome 90+
- Edge 90+
- Firefox 88+ (may have reduced performance)

## Troubleshooting

### Camera Not Working
1. Check browser permissions in Settings
2. Ensure no other app is using the camera
3. Try reloading the page
4. Check browser console for specific errors

### MediaPipe Loading Issues
- Ensure stable internet connection (MediaPipe loads WASM files)
- Clear browser cache and reload
- Check console for specific error messages

### Build Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is correct

## Development Notes

- The app requires HTTPS in production (camera API requirement)
- Use `localhost` for development (HTTP is allowed)
- MediaPipe models are loaded from CDN on first run

## Project Structure

```
accesspoint/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── package.json        # Dependencies
```

## For Hackathon Demo

1. Install all dependencies beforehand
2. Test camera permissions work
3. Have backup plan for camera issues (mouse control mode)
4. Pre-load the app before demo to avoid MediaPipe download delay

## License

MIT (or your chosen license)
