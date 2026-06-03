/**
 * Client-side configuration constants
 */

export const DIFFICULTY_CONFIG = {
  EASY: {
    name: 'Helppo',
    startMs: 30_000,
    bonusMs: 5_000,
    threeProbability: 0.2,
  },
  NORMAL: {
    name: 'Normaali',
    startMs: 20_000,
    bonusMs: 3_500,
    threeProbability: 0.4,
  },
  HARD: {
    name: 'Vaikea',
    startMs: 10_000,
    bonusMs: 2_000,
    threeProbability: 0.6,
  },
} as const;

export const AUDIO_CONFIG = {
  TICK_NORMAL_FREQ: 400,
  TICK_URGENT_FREQ: 800,
  ACCEPT_FREQ_1: 600,
  ACCEPT_FREQ_2: 800,
  REJECT_FREQ: 150,
  TONE_DURATION_SHORT: 0.05,
  TONE_DURATION_MEDIUM: 0.1,
  TONE_DURATION_LONG: 0.3,
  DEFAULT_VOLUME: 0.1,
} as const;

export const UI_CONFIG = {
  ERROR_MESSAGE_DURATION_MS: 3000,
  MAX_USERNAME_LENGTH: 20,
  ADMIN_PASSWORD_DEFAULT: 'admin',
  BOMB_DANGER_THRESHOLD_MS: 3000,
} as const;

export const SOCKET_CONFIG = {
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
} as const;

export const STORAGE_KEYS = {
  AUDIO_MUTED: 'pommipeli_audio_muted',
  LAST_DIFFICULTY: 'pommipeli_last_difficulty',
  USERNAME: 'pommipeli_username',
} as const;
