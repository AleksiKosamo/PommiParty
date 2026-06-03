# 💣 PommiPeli (Solo)

Real-time Finnish single-player word-bomb game. Type words containing the given syllable under pressure before the bomb explodes!

---

## Features

- **Three Difficulty Levels**: Easy (30s start, +5s bonus), Normal (20s, +3.5s), and Hard (10s, +2s).
- **Escalation**: Syllable difficulty increases as your score grows.
- **Local Leaderboard**: Keeps track of high scores for each difficulty level.
- **Simple Windows Launcher**: One-click startup with the double-clickable `Start_PommiParty.bat` script.

---

## Quick Start (Development & Local Play)

### 1. Install dependencies

```bash
# From the project root
npm install          # installs concurrently
npm run install:all  # installs client + server dependencies
```

### 2. Run the game (Windows)

Simply double-click the **`Start_PommiParty.bat`** file in the root folder. 

This will automatically:
1. Start both client and server processes in local development mode.
2. Wait a few seconds for initialization.
3. Launch your default web browser to the game at `http://localhost:5173`.

Alternatively, manually run:
```bash
npm run dev
```

---

## Stack

- **Client**: React + Vite + TypeScript + Socket.IO-client
- **Server**: Node.js + Express + Socket.IO
- **Data Store**: Filesystem-based JSON storage for rankings.

---

## Data Files

| File | Description |
|---|---|
| `server/data/words.txt` | Seed word list used for dictionary validation and syllable generation |
| `server/data/solo_rankings.json` | Solo mode leaderboard — auto-created, gitignored |

---

## 🚀 Recent Improvements

### Code Quality & Maintainability
- ✅ **Centralized Configuration**: Game settings extracted to `config.ts` files (server & client)
- ✅ **String Utilities**: Reusable normalization and validation helpers in `utils/stringUtils.ts`
- ✅ **Unit Tests**: Test suite added for dictionary functions with Jest configuration
- ✅ **Error Boundary**: React Error Boundary component for graceful error handling
- ✅ **Global Error Handler**: Unhandled promise rejections and error event logging

### State Management & Persistence
- ✅ **localStorage Integration**: Audio mute state and last difficulty preference persist across sessions
- ✅ **Storage Utilities**: Centralized `storage.ts` for all localStorage operations
- ✅ **Socket Cleanup**: Proper event listener cleanup prevents memory leaks

### User Experience
- ✅ **Keyboard Shortcuts**: 
  - `Enter` to submit words
  - `Escape` to exit to lobby
  - `M` to mute/unmute audio
- ✅ **Better Error Messages**: Context-aware error messages for connection issues
- ✅ **Audio Manager**: Type-safe audio configuration with centralized constants

### Platform Support
- ✅ **Cross-Platform Launcher**: Added `start.sh` for macOS and Linux (in addition to Windows `.bat`)
- ✅ **Improved Startup**: Auto-detects missing dependencies and installs if needed

---

## 🎮 Keyboard Controls

See [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) for a complete list of keyboard controls.

---

## 🧪 Testing

Run tests for the server-side dictionary functions:

```bash
# Navigate to server directory
cd server

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Cross-Platform Support

### Windows
Double-click `Start_PommiParty.bat` or run:
```bash
npm run dev
```

### macOS / Linux
Run the shell script:
```bash
bash ./start.sh
```
or:
```bash
npm run dev
```

---
