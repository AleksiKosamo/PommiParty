import { EventEmitter } from 'events';
import { SoloState, SoloPhase, Difficulty } from './types';
import {
  isValidFinnishWordAsync,
  containsSyllable,
  getRandomSyllable,
  getWeightedRandomSyllable,
} from './dictionary';

type DifficultyConfig = { startMs: number; bonusMs: number };

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  EASY: { startMs: 30_000, bonusMs: 5_000 },
  NORMAL: { startMs: 20_000, bonusMs: 3_500 },
  HARD: { startMs: 10_000, bonusMs: 2_000 },
};

type SoloEvents = {
  state_update: [SoloState];
  timer_update: [number];
  word_accepted: [{ word: string }];
  word_rejected: [{ reason: string }];
  gameover: [{ score: number; highScore: number; durationMs: number }];
};

export class SoloRoom extends EventEmitter {
  private state: SoloState;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private timerEndAt = 0;
  private startedAt = 0;

  // Track high scores per difficulty
  private highScores: Record<Difficulty, number> = {
    EASY: 0,
    NORMAL: 0,
    HARD: 0,
  };

  constructor() {
    super();
    this.state = {
      phase: 'READY',
      difficulty: 'NORMAL',
      currentSyllable: '',
      timerRemaining: DIFFICULTY_SETTINGS.NORMAL.startMs,
      score: 0,
      usedWords: [],
      lastWord: null,
      highScore: 0,
      isRanked: false,
    };
  }

  getState(): SoloState {
    return { ...this.state };
  }

  start(difficulty: Difficulty = this.state.difficulty, isRanked = false): void {
    this.clearTick();
    this.startedAt = Date.now();

    const config = DIFFICULTY_SETTINGS[difficulty];
    const hs = this.highScores[difficulty];

    this.state = {
      phase: 'PLAYING',
      difficulty,
      currentSyllable: this.randomSyllable(isRanked, 0),
      timerRemaining: config.startMs,
      score: 0,
      usedWords: [],
      lastWord: null,
      highScore: hs,
      isRanked,
    };

    this.broadcast();
    this.startTick(config.startMs);
  }

  async submitWord(word: string): Promise<void> {
    if (this.state.phase !== 'PLAYING') {
      this.emit('word_rejected', { reason: 'Peli ei ole käynnissä.' });
      return;
    }

    const normalized = word.trim().toLowerCase().replace(/\s+/g, '');

    if (!containsSyllable(normalized, this.state.currentSyllable)) {
      this.emit('word_rejected', {
        reason: `Sanan on sisällettävä "${this.state.currentSyllable}".`,
      });
      return;
    }
    if (this.state.usedWords.includes(normalized)) {
      this.emit('word_rejected', { reason: 'Sana on jo käytetty.' });
      return;
    }

    // Async dictionary check (Wiktionary if not in seed list)
    const valid = await isValidFinnishWordAsync(normalized);

    // Check phase again — timer may have hit 0 while awaiting
    if (this.state.phase !== 'PLAYING') return;

    if (!valid) {
      this.emit('word_rejected', { reason: 'Ei löydy sanastosta.' });
      return;
    }

    // Accept
    this.state.usedWords.push(normalized);
    this.state.score++;
    this.state.lastWord = normalized;

    const config = DIFFICULTY_SETTINGS[this.state.difficulty];

    // Extend timer
    const remaining = Math.max(0, this.timerEndAt - Date.now());

    // Ranked escalation: reduce bonus time as score increases
    let bonus = config.bonusMs;
    if (this.state.isRanked) {
      const tiers = Math.floor(this.state.score / 5);
      bonus = Math.max(1500, config.bonusMs - tiers * 300); // decreases by 0.3s every 5 words
    }

    const newRemaining = Math.min(remaining + bonus, config.startMs);
    this.timerEndAt = Date.now() + newRemaining;
    this.state.timerRemaining = newRemaining;

    // New syllable is chosen randomly to keep solo mode feeling like Bomb Party.
    this.state.currentSyllable = this.randomSyllable(this.state.isRanked, this.state.score);

    this.emit('word_accepted', { word: normalized });
    this.broadcast();
  }

  destroy(): void {
    this.clearTick();
  }

  // ── internals ───────────────────────────────────────────────────────────

  private startTick(duration: number): void {
    this.clearTick();
    this.timerEndAt = Date.now() + duration;

    this.tickInterval = setInterval(() => {
      const remaining = Math.max(0, this.timerEndAt - Date.now());
      this.state.timerRemaining = remaining;
      this.emit('timer_update', remaining);

      if (remaining <= 0) {
        this.clearTick();
        this.onGameOver();
      }
    }, 250);
  }

  private clearTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private onGameOver(): void {
    this.state.phase = 'GAMEOVER';

    // Update high score
    const diff = this.state.difficulty;
    if (this.state.score > this.highScores[diff]) {
      this.highScores[diff] = this.state.score;
      this.state.highScore = this.state.score;
    }

    const durationMs = Date.now() - this.startedAt;
    this.emit('gameover', {
      score: this.state.score,
      highScore: this.highScores[diff],
      durationMs,
    });
    this.broadcast();
  }

  private broadcast(): void {
    this.emit('state_update', this.getState());
  }

  private randomSyllable(isRanked = false, score = 0): string {
    if (!isRanked) return getRandomSyllable(this.state.currentSyllable);

    // Ranked escalation: increase chance of 3-letter syllables
    const tiers = Math.floor(score / 5);
    const threeProb = Math.min(0.85, 0.02 + tiers * 0.08); // Starts at 2%, +8% every 5 words
    return getWeightedRandomSyllable(threeProb, this.state.currentSyllable);
  }

  emit<K extends keyof SoloEvents>(event: K, ...args: SoloEvents[K]): boolean {
    return super.emit(event as string, ...args);
  }
}
