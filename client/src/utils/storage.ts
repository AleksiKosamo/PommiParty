/**
 * Local storage persistence utilities
 */

import { Difficulty } from '../types';
import { STORAGE_KEYS } from '../config';

export const storage = {
  /**
   * Get stored audio mute state
   */
  getAudioMuted(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIO_MUTED);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  },

  /**
   * Save audio mute state
   */
  setAudioMuted(muted: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_MUTED, JSON.stringify(muted));
    } catch {
      console.warn('Failed to save audio muted state');
    }
  },

  /**
   * Get last selected difficulty
   */
  getLastDifficulty(): Difficulty {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_DIFFICULTY);
      if (stored && ['EASY', 'NORMAL', 'HARD'].includes(stored)) {
        return stored as Difficulty;
      }
    } catch {
      // Ignore
    }
    return 'NORMAL';
  },

  /**
   * Save last selected difficulty
   */
  setLastDifficulty(difficulty: Difficulty): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_DIFFICULTY, difficulty);
    } catch {
      console.warn('Failed to save last difficulty');
    }
  },

  /**
   * Get stored username
   */
  getUsername(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.USERNAME);
    } catch {
      return null;
    }
  },

  /**
   * Save username
   */
  setUsername(username: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    } catch {
      console.warn('Failed to save username');
    }
  },

  /**
   * Clear all PommiParty data
   */
  clear(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch {
      console.warn('Failed to clear storage');
    }
  },
};
