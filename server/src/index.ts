import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameRoom } from './GameRoom';
import { SoloRoom } from './SoloRoom';
import { loadDictionary } from './dictionary';
import { logger } from './logger';
import { loadRankings, getLeaderboard, getTopSoloRankings, updateSoloScore } from './leaderboard';
import { EVENTS, Difficulty, LeaderboardEntry } from './types';

// ── Bootstrap ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

// REST endpoint for leaderboard (optional, fallback)
app.get('/leaderboard', (_req, res) => res.json(getLeaderboard()));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin';
if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'admin') {
  logger.error(
    'ADMIN_PASSWORD is unset or uses the default in production. Set ADMIN_PASSWORD env var.'
  );
  process.exit(1);
} else if (ADMIN_PASSWORD === 'admin') {
  logger.warn(
    'Using default ADMIN_PASSWORD in non-production. Set ADMIN_PASSWORD to secure admin access.'
  );
}

// ── Room registries ───────────────────────────────────────────────────────

const multiplayerRooms = new Map<string, GameRoom>();
const soloRooms = new Map<string, SoloRoom>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function makeUniqueCode(): string {
  let code = generateCode();
  while (multiplayerRooms.has(code)) code = generateCode();
  return code;
}

const bannedUsernameFragments = [
  'vittu',
  'saatana',
  'paska',
  'perse',
  'kusi',
  'mulkk',
  'kakka',
  'natsi',
  'rasisti',
];
function sanitizeUsername(input: string): string | null {
  const username = input.trim().slice(0, 20);
  if (!username) return null;
  const normalized = username.toLowerCase();
  if (bannedUsernameFragments.some((fragment) => normalized.includes(fragment))) return null;
  return username;
}

function createMultiplayerRoom(code: string, isRanked = false): GameRoom {
  const room = new GameRoom(code, isRanked);
  multiplayerRooms.set(code, room);

  room.on('state_update', (state) => io.to(code).emit(EVENTS.GAME_STATE, state));
  room.on('word_accepted', (data) => io.to(code).emit(EVENTS.WORD_ACCEPTED, data));
  room.on('bomb_exploded', (loserId) => io.to(code).emit(EVENTS.BOMB_EXPLODED, { loserId }));
  room.on('timer_update', (remaining) => io.to(code).emit(EVENTS.TIMER_UPDATE, { remaining }));
  room.on('starting_countdown', (count) => io.to(code).emit(EVENTS.STARTING_COUNTDOWN, { count }));
  room.on('error_event', (message) => io.to(code).emit(EVENTS.ERROR, { message }));

  // On ranked game_over, push fresh leaderboard to everyone
  room.on('game_over', (data) => {
    io.to(code).emit(EVENTS.GAME_OVER, data);
    if (isRanked) {
      const lb: LeaderboardEntry[] = getLeaderboard();
      io.emit(EVENTS.LEADERBOARD_DATA, lb); // broadcast to all connected clients
    }
  });

  return room;
}

function createSoloRoom(socketId: string): SoloRoom {
  const room = new SoloRoom();
  soloRooms.set(socketId, room);

  room.on('state_update', (st) => io.to(socketId).emit(EVENTS.SOLO_STATE, st));
  room.on('timer_update', (rem) =>
    io.to(socketId).emit(EVENTS.SOLO_TIMER_UPDATE, { remaining: rem })
  );
  room.on('word_accepted', (data) => io.to(socketId).emit(EVENTS.SOLO_WORD_ACCEPTED, data));
  room.on('word_rejected', (data) => io.to(socketId).emit(EVENTS.SOLO_WORD_REJECTED, data));
  room.on('gameover', (data) => io.to(socketId).emit(EVENTS.SOLO_GAMEOVER, data));

  return room;
}

// ── Socket handlers ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  let currentMultiplayerRoom: string | null = null;
  let isAdmin = false;
  let soloScoreSubmittedAt = 0; // timestamp of last accepted score submission
  logger.debug(`[+] ${socket.id} connected`);

  // ==========================================
  //  LEADERBOARD
  // ==========================================
  socket.on(EVENTS.GET_SOLO_LEADERBOARD, ({ difficulty }: { difficulty: Difficulty }) => {
    socket.emit(EVENTS.SOLO_LEADERBOARD_DATA, getTopSoloRankings(difficulty));
  });

  socket.on(
    EVENTS.SUBMIT_SOLO_SCORE,
    ({
      score,
      durationMs,
      difficulty,
    }: {
      score: number;
      durationMs: number;
      difficulty?: Difficulty;
    }) => {
      // Rate-limit: only one score submission per 5 seconds per socket
      const now = Date.now();
      if (now - soloScoreSubmittedAt < 5_000) {
        logger.warn(`[Score] Rate-limited score submission from ${socket.id}`);
        return;
      }
      soloScoreSubmittedAt = now;

      // Basic sanity checks
      if (typeof score !== 'number' || score < 0 || score > 10_000) return;
      if (typeof durationMs !== 'number' || durationMs < 1_000) return;

      const safeDifficulty = difficulty ?? 'NORMAL';
      updateSoloScore(score, durationMs, safeDifficulty);
      io.emit(EVENTS.SOLO_LEADERBOARD_DATA, getTopSoloRankings(safeDifficulty));
    }
  );

  // ==========================================
  //  MULTIPLAYER EVENTS
  // ==========================================
  socket.on(
    EVENTS.CREATE_ROOM,
    ({ username, isRanked }: { username: string; isRanked?: boolean }) => {
      const safeUsername = sanitizeUsername(username);
      if (!safeUsername) {
        socket.emit(EVENTS.ERROR, { message: 'Nimimerkki ei ole sallittu.' });
        return;
      }

      const code = makeUniqueCode();
      if (currentMultiplayerRoom && currentMultiplayerRoom !== code) {
        socket.leave(currentMultiplayerRoom);
      }
      currentMultiplayerRoom = code;
      const room = createMultiplayerRoom(code, !!isRanked);
      socket.join(code);
      room.addPlayer(socket.id, safeUsername, true);
      socket.emit(EVENTS.ROOM_CREATED, { roomCode: code });
      socket.emit(EVENTS.GAME_STATE, room.getState());
    }
  );

  socket.on(EVENTS.JOIN_ROOM, ({ roomCode, username }: { roomCode: string; username: string }) => {
    const safeUsername = sanitizeUsername(username);
    if (!safeUsername) {
      socket.emit(EVENTS.ERROR, { message: 'Nimimerkki ei ole sallittu.' });
      return;
    }

    const code = roomCode.toUpperCase().trim();
    const room = multiplayerRooms.get(code);

    if (!room) {
      socket.emit(EVENTS.ERROR, { message: 'Huonetta ei löydy.' });
      return;
    }
    if (room.getState().phase !== 'LOBBY') {
      socket.emit(EVENTS.ERROR, { message: 'Peli on jo käynnissä.' });
      return;
    }

    if (currentMultiplayerRoom && currentMultiplayerRoom !== code) {
      socket.leave(currentMultiplayerRoom);
    }
    currentMultiplayerRoom = code;
    socket.join(code);
    room.addPlayer(socket.id, safeUsername, false);
    socket.emit(EVENTS.GAME_STATE, room.getState());
  });

  socket.on(EVENTS.START_GAME, () => {
    if (!currentMultiplayerRoom) return;
    const room = multiplayerRooms.get(currentMultiplayerRoom);
    if (!room) return;
    if (!room.isHost(socket.id)) {
      socket.emit(EVENTS.ERROR, { message: 'Vain isäntä voi aloittaa pelin.' });
      return;
    }
    room.startGame();
  });

  socket.on(EVENTS.ADMIN_LOGIN, ({ password }: { password: string }) => {
    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      socket.emit(EVENTS.ADMIN_AUTHORIZED);
    } else {
      socket.emit(EVENTS.ERROR, { message: 'Väärä salasana.' });
    }
  });

  socket.on(EVENTS.KICK_PLAYER, ({ targetId }: { targetId: string }) => {
    if (!currentMultiplayerRoom) return;
    const room = multiplayerRooms.get(currentMultiplayerRoom);
    if (!room) return;
    if (!room.isHost(socket.id) && !isAdmin) {
      socket.emit(EVENTS.ERROR, { message: 'Vain isäntä tai ylläpitäjä voi potkia pelaajan.' });
      return;
    }
    if (targetId === socket.id) return;

    const target = room.getState().players.find((p) => p.id === targetId);
    if (!target) {
      socket.emit(EVENTS.ERROR, { message: 'Pelaajaa ei löydy huoneesta.' });
      return;
    }

    room.removePlayer(targetId);
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.leave(currentMultiplayerRoom);
      targetSocket.emit(EVENTS.KICKED, { reason: 'Sinut potkaistiin huoneesta.' });
    }
    if (room.isEmpty()) multiplayerRooms.delete(currentMultiplayerRoom);
  });

  socket.on(EVENTS.SUBMIT_WORD, async ({ word }: { word: string }) => {
    if (!currentMultiplayerRoom) return;
    const room = multiplayerRooms.get(currentMultiplayerRoom);
    if (!room) return;
    if (typeof word !== 'string' || !word.trim() || word.trim().length > 60) {
      socket.emit(EVENTS.WORD_REJECTED, { reason: 'Invalid word.' });
      return;
    }
    const result = await room.submitWord(socket.id, word);
    if (!result.accepted) {
      socket.emit(EVENTS.WORD_REJECTED, { reason: result.reason });
    }
  });

  socket.on(EVENTS.GIVE_UP, () => {
    if (!currentMultiplayerRoom) return;
    const room = multiplayerRooms.get(currentMultiplayerRoom);
    if (room) room.giveUp(socket.id);
  });

  socket.on(EVENTS.TYPING_UPDATE, ({ word }: { word: string }) => {
    if (!currentMultiplayerRoom) return;
    socket.to(currentMultiplayerRoom).emit(EVENTS.TYPING_UPDATE, { playerId: socket.id, word });
  });

  socket.on(EVENTS.PLAY_AGAIN, () => {
    if (!currentMultiplayerRoom) return;
    const room = multiplayerRooms.get(currentMultiplayerRoom);
    if (room?.isHost(socket.id)) room.resetToLobby();
  });

  // ==========================================
  //  SOLO EVENTS
  // ==========================================
  socket.on(EVENTS.SOLO_START, ({ difficulty }: { difficulty: Difficulty }) => {
    let solo = soloRooms.get(socket.id);
    if (!solo) solo = createSoloRoom(socket.id);
    solo.start(difficulty);
  });

  socket.on(EVENTS.SOLO_SUBMIT, ({ word }: { word: string }) => {
    const solo = soloRooms.get(socket.id);
    if (solo) solo.submitWord(word).catch((e) => logger.error(e));
  });

  socket.on(EVENTS.SOLO_RESTART, () => {
    const solo = soloRooms.get(socket.id);
    if (solo) solo.start();
  });

  // ==========================================
  //  DISCONNECT
  // ==========================================
  socket.on('disconnect', () => {
    logger.debug(`[-] ${socket.id} disconnected`);

    if (currentMultiplayerRoom) {
      const room = multiplayerRooms.get(currentMultiplayerRoom);
      if (room) {
        room.removePlayer(socket.id);
        if (room.isEmpty()) multiplayerRooms.delete(currentMultiplayerRoom);
      }
    }

    const solo = soloRooms.get(socket.id);
    if (solo) {
      solo.destroy();
      soloRooms.delete(socket.id);
    }
  });
});

// ── Listen ────────────────────────────────────────────────────────────────

Promise.all([loadDictionary()])
  .then(() => {
    loadRankings();
    const basePort = Number(process.env.PORT ?? 3001);
    const maxRetries = 3;

    function startServer(port: number, retriesLeft: number) {
      server.once('error', (err: any) => {
        if (err && err.code === 'EADDRINUSE' && retriesLeft > 0) {
          logger.warn(`Port ${port} in use, trying ${port + 1}...`);
          startServer(port + 1, retriesLeft - 1);
          return;
        }
        logger.error('Failed to start server:', err);
        process.exit(1);
      });

      server.listen(port, () => {
        logger.info(`\n🎮 PommiPeli server running on http://localhost:${port}\n`);
      });
    }

    startServer(basePort, maxRetries);
  })
  .catch((e) => logger.error(e));
