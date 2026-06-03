/**
 * Server-side configuration constants
 */

export const DIFFICULTY_SETTINGS = {
  EASY: { startMs: 30_000, bonusMs: 5_000 },
  NORMAL: { startMs: 20_000, bonusMs: 3_500 },
  HARD: { startMs: 10_000, bonusMs: 2_000 },
} as const;

export const GAME_CONFIG = {
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_CHARSET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  MAX_ROOM_INACTIVITY_MS: 3600_000, // 1 hour
  BANNED_USERNAME_FRAGMENTS: [
    'vittu',
    'saatana',
    'paska',
    'perse',
    'kusi',
    'mulkk',
    'kakka',
    'natsi',
    'rasisti',
  ],
  MAX_USERNAME_LENGTH: 20,
} as const;

export const DICTIONARY_CONFIG = {
  MIN_WORD_LENGTH_FOR_SYLLABLES: 3,
  MIN_SYLLABLE_OCCURRENCES: 5,
  MAX_2LETTER_SYLLABLES: 100,
  MAX_3LETTER_SYLLABLES: 80,
  DEFAULT_SYLLABLES: ['ka', 'ta', 'sa', 'la'],
} as const;

export const SOCKET_CONFIG = {
  CORS_ORIGIN: '*',
  CORS_METHODS: ['GET', 'POST'],
} as const;

export const ENV_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
} as const;
