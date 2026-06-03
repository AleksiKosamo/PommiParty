# 💣 PommiPeli (Solo)

Real-time Finnish single-player word-bomb game. Type words containing the given syllable under pressure before the bomb explodes!

---

## Features

- **Three Difficulty Levels**: Easy (30s start, +5s bonus), Normal (20s, +3.5s), and Hard (10s, +2s).
- **Escalation**: Syllable difficulty increases as your score grows.
- **Local Leaderboard**: Keeps track of high scores for each difficulty level.

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
