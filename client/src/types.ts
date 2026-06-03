// ── Shared types (mirrored from server/src/types.ts) ─────────────────────

export type GamePhase = 'LOBBY' | 'STARTING' | 'IN_ROUND' | 'ROUND_END' | 'GAME_OVER';

export type SoloPhase = 'READY' | 'PLAYING' | 'GAMEOVER';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface Player {
  id: string;
  username: string;
  score: number;
  alive: boolean;
  isHost: boolean;
  lives: number;
  wordsAnswered: number;
  usedLetters: string[];
}

export interface GameState {
  phase: GamePhase;
  roomCode: string;
  players: Player[];
  currentSyllable: string;
  currentBombHolder: string | null;
  timerRemaining: number;
  usedWords: string[];
  round: number;
  maxRounds: number;
  wordCount: number;
  isRanked: boolean;
}

export interface SoloState {
  phase: SoloPhase;
  difficulty: Difficulty;
  currentSyllable: string;
  timerRemaining: number;
  score: number;
  usedWords: string[];
  lastWord: string | null;
  highScore: number;
}

export interface LeaderboardEntry {
  score: number;
  durationMs: number;
  date: string;
  difficulty: Difficulty;
}

export type WordAcceptedPayload = { word: string; playerId: string; newBombHolder: string };
export type WordRejectedPayload = { reason: string };
export type BombExplodedPayload = { loserId: string };
export type GameOverPayload = {
  winner: string | null;
  scores: Player[];
  eloChanges?: Record<string, number>;
};

export const EVENTS = {
  // Multiplayer Client → Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  START_GAME: 'start_game',
  SUBMIT_WORD: 'submit_word',
  GIVE_UP: 'give_up',
  PLAY_AGAIN: 'play_again',
  TYPING_UPDATE: 'typing_update',
  KICK_PLAYER: 'kick_player',

  // Leaderboard
  GET_LEADERBOARD: 'get_leaderboard',
  LEADERBOARD_DATA: 'leaderboard_data',
  GET_SOLO_LEADERBOARD: 'get_solo_leaderboard',
  SOLO_LEADERBOARD_DATA: 'solo_leaderboard_data',
  SUBMIT_SOLO_SCORE: 'submit_solo_score',
  ADMIN_LOGIN: 'admin_login',
  ADMIN_AUTHORIZED: 'admin_authorized',

  // Multiplayer Server → Client
  GAME_STATE: 'game_state',
  WORD_ACCEPTED: 'word_accepted',
  WORD_REJECTED: 'word_rejected',
  BOMB_EXPLODED: 'bomb_exploded',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  TIMER_UPDATE: 'timer_update',
  STARTING_COUNTDOWN: 'starting_countdown',
  ROOM_CREATED: 'room_created',

  // Solo Client → Server
  SOLO_START: 'solo_start',
  SOLO_SUBMIT: 'solo_submit',
  SOLO_RESTART: 'solo_restart',

  // Solo Server → Client
  SOLO_STATE: 'solo_state',
  SOLO_WORD_ACCEPTED: 'solo_word_accepted',
  SOLO_WORD_REJECTED: 'solo_word_rejected',
  SOLO_TIMER_UPDATE: 'solo_timer_update',
  SOLO_GAMEOVER: 'solo_gameover',
  KICKED: 'kicked',
} as const;
