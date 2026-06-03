import { EventEmitter } from 'events';
import { GameState, Player } from './types';
import { isValidFinnishWordAsync, containsSyllable, getWeightedRandomSyllable } from './dictionary';

// ── Difficulty scaling constants ─────────────────────────────────────────────
const DEFAULT_BOMB_MS = 15_000; // starting timer
const MIN_BOMB_MS = 7_000; // hard floor
const TIMER_STEP_MS = 500; // decrease per tier
const WORDS_PER_TIER = 5; // words before next tier
const THREE_LETTER_START = 0.02; // starting 3-letter probability
const THREE_LETTER_STEP = 0.08; // increase per tier
const THREE_LETTER_CAP = 0.85; // hard cap

const STARTING_TICKS = 3;
const ALPHABET_SIZE = 29; // a-z + äöå

type GameRoomEvents = {
  state_update: [GameState];
  word_accepted: [{ word: string; playerId: string; newBombHolder: string }];
  bomb_exploded: [string];
  game_over: [{ winner: string | null; scores: Player[]; eloChanges?: Record<string, number> }];
  timer_update: [number];
  starting_countdown: [number];
  error_event: [string];
};

export class GameRoom extends EventEmitter {
  public readonly roomCode: string;
  public readonly isRanked: boolean;

  private state: GameState;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private timerEndAt = 0;
  private failedCurrentSyllable: Set<string> = new Set();
  private eliminatedPlayers: string[] = []; // IDs in order of elimination (first to die is at index 0)

  constructor(roomCode: string, isRanked = false) {
    super();
    this.roomCode = roomCode;
    this.isRanked = isRanked;
    this.state = {
      phase: 'LOBBY',
      roomCode,
      players: [],
      currentSyllable: '',
      currentBombHolder: null,
      timerRemaining: 0,
      usedWords: [],
      round: 0,
      maxRounds: 1,
      wordCount: 0,
      isRanked,
    };
  }

  // ── Derived difficulty values ─────────────────────────────────────────────

  private get currentBombDuration(): number {
    const tier = Math.floor(this.state.wordCount / WORDS_PER_TIER);
    return Math.max(MIN_BOMB_MS, DEFAULT_BOMB_MS - tier * TIMER_STEP_MS);
  }

  private get threeProbability(): number {
    const tier = Math.floor(this.state.wordCount / WORDS_PER_TIER);
    return Math.min(THREE_LETTER_CAP, THREE_LETTER_START + tier * THREE_LETTER_STEP);
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  getState(): GameState {
    return structuredClone(this.state);
  }

  isEmpty(): boolean {
    return this.state.players.length === 0;
  }

  isHost(id: string): boolean {
    return this.state.players.find((p) => p.id === id)?.isHost ?? false;
  }

  // ── Session management ─────────────────────────────────────────────────────

  addPlayer(id: string, username: string, isHost: boolean): void {
    if (this.state.players.find((p) => p.id === id)) return;
    this.state.players.push({
      id,
      username,
      score: 0,
      alive: true,
      isHost,
      lives: 3,
      wordsAnswered: 0,
      usedLetters: [],
    });
    this.broadcast();
  }

  removePlayer(id: string): void {
    const wasHolder = this.state.currentBombHolder === id;
    this.state.players = this.state.players.filter((p) => p.id !== id);
    this.failedCurrentSyllable.delete(id);

    if (this.state.players.length > 0 && !this.state.players.some((p) => p.isHost)) {
      this.state.players[0].isHost = true;
    }

    const alive = this.alivePlayers();

    if (this.state.phase === 'IN_ROUND') {
      if (alive.length <= 1) {
        this.clearTick();
        this.endGame();
        return;
      }
      if (wasHolder) {
        this.state.currentBombHolder = this.randomAliveExcept(null);
        this.startTick(this.currentBombDuration);
      }
    }

    this.broadcast();
  }

  // ── Game flow ──────────────────────────────────────────────────────────────

  startGame(): void {
    if (this.state.phase !== 'LOBBY') return;
    if (this.state.players.length < 2) {
      this.emit('error_event', 'Tarvitaan vähintään 2 pelaajaa aloittamiseen.');
      return;
    }

    this.state.phase = 'STARTING';
    this.state.round = 1;
    this.state.wordCount = 0;
    this.state.players.forEach((p) => {
      p.score = 0;
      p.alive = true;
      p.lives = 3;
      p.wordsAnswered = 0;
      p.usedLetters = [];
    });
    this.eliminatedPlayers = [];
    this.broadcast();

    let tick = STARTING_TICKS;
    this.emit('starting_countdown', tick);

    const iv = setInterval(() => {
      tick--;
      if (tick <= 0) {
        clearInterval(iv);
        this.startContinuousGame();
      } else {
        this.emit('starting_countdown', tick);
      }
    }, 1_000);
  }

  giveUp(playerId: string): void {
    if (this.state.phase !== 'IN_ROUND') return;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player || !player.alive) return;

    // Immediately eliminate
    player.lives = 0;
    player.alive = false;
    this.eliminatedPlayers.push(playerId);

    const wasHolder = this.state.currentBombHolder === playerId;
    const alive = this.alivePlayers();

    if (alive.length <= 1) {
      this.endGame();
    } else if (wasHolder) {
      // Pass bomb immediately to someone else
      this.state.currentBombHolder = this.randomAliveExcept(playerId);
      this.startTick(this.currentBombDuration);
      this.broadcast();
    } else {
      this.broadcast();
    }
  }

  async submitWord(
    playerId: string,
    word: string
  ): Promise<{ accepted: boolean; reason?: string }> {
    if (this.state.phase !== 'IN_ROUND') {
      return { accepted: false, reason: 'Peli ei ole käynnissä.' };
    }
    if (this.state.currentBombHolder !== playerId) {
      return { accepted: false, reason: 'Ei ole sinun vuorosi.' };
    }

    const normalized = word.trim().toLowerCase();

    if (!containsSyllable(normalized, this.state.currentSyllable)) {
      return { accepted: false, reason: `Sanan on sisällettävä "${this.state.currentSyllable}".` };
    }
    if (this.state.usedWords.includes(normalized)) {
      return { accepted: false, reason: 'Sana on jo käytetty tässä pelissä.' };
    }

    const isValid = await isValidFinnishWordAsync(normalized);

    if (this.state.phase !== 'IN_ROUND' || this.state.currentBombHolder !== playerId) {
      return { accepted: false, reason: 'Aika loppui tai vuoro vaihtui.' };
    }

    if (!isValid) {
      return { accepted: false, reason: 'Ei kelpaa – ei löydy sanastosta.' };
    }

    // ── Accept word ──────────────────────────────────────────────────────────
    this.state.usedWords.push(normalized);
    this.state.wordCount++;

    // Award score to submitter
    const submitter = this.state.players.find((p) => p.id === playerId);
    if (submitter) {
      submitter.score++;
      submitter.wordsAnswered++;

      // Bonus alphabet mechanic
      for (const char of normalized) {
        if (/^[a-zäöå]$/.test(char) && !submitter.usedLetters.includes(char)) {
          submitter.usedLetters.push(char);
        }
      }

      if (submitter.usedLetters.length >= ALPHABET_SIZE) {
        submitter.lives++;
        submitter.usedLetters = [];
      }
    }

    // Pass bomb & reset timer
    const newHolder = this.randomAliveExcept(playerId);
    this.state.currentBombHolder = newHolder;
    this.timerEndAt = Date.now() + this.currentBombDuration;
    this.state.timerRemaining = this.currentBombDuration;

    // New syllable on every correct word
    this.state.currentSyllable = getWeightedRandomSyllable(
      this.threeProbability,
      this.state.currentSyllable
    );
    this.failedCurrentSyllable.clear();

    this.emit('word_accepted', { word: normalized, playerId, newBombHolder: newHolder });
    this.broadcast();
    return { accepted: true };
  }

  resetToLobby(): void {
    this.clearTick();
    this.state.phase = 'LOBBY';
    this.state.round = 0;
    this.state.wordCount = 0;
    this.state.currentBombHolder = null;
    this.state.currentSyllable = '';
    this.state.usedWords = [];
    this.state.players.forEach((p) => {
      p.score = 0;
      p.alive = true;
      p.lives = 3;
      p.wordsAnswered = 0;
      p.usedLetters = [];
    });
    this.failedCurrentSyllable.clear();
    this.broadcast();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private startContinuousGame(): void {
    this.state.phase = 'IN_ROUND';
    this.state.usedWords = [];
    this.state.wordCount = 0;
    this.state.players.forEach((p) => {
      p.alive = true;
      p.lives = 3;
      p.wordsAnswered = 0;
      p.usedLetters = [];
    });
    this.state.currentSyllable = getWeightedRandomSyllable(this.threeProbability);
    this.state.currentBombHolder = this.randomAliveExcept(null);
    this.failedCurrentSyllable.clear();

    this.broadcast();
    this.startTick(this.currentBombDuration);
  }

  private startTick(duration: number): void {
    this.clearTick();
    this.timerEndAt = Date.now() + duration;
    this.state.timerRemaining = duration;

    this.tickInterval = setInterval(() => {
      const remaining = Math.max(0, this.timerEndAt - Date.now());
      this.state.timerRemaining = remaining;
      this.emit('timer_update', remaining);

      if (remaining <= 0) {
        this.clearTick();
        this.onBombExplode();
      }
    }, 250);
  }

  private clearTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private onBombExplode(): void {
    const loser = this.state.players.find((p) => p.id === this.state.currentBombHolder);
    if (!loser) {
      this.endGame();
      return;
    }

    loser.lives -= 1;
    if (loser.lives <= 0) {
      loser.alive = false;
      this.eliminatedPlayers.push(loser.id);
    }

    this.failedCurrentSyllable.add(loser.id);
    this.state.phase = 'ROUND_END';

    this.emit('bomb_exploded', loser.id);
    this.broadcast();

    const alive = this.alivePlayers();

    setTimeout(() => {
      if (alive.length <= 1) {
        this.endGame();
      } else {
        this.state.phase = 'IN_ROUND';
        this.state.currentBombHolder = this.randomAliveExcept(loser.id);

        // Regenerate syllable only if everyone alive has failed this one
        const allFailed = alive.every((p) => this.failedCurrentSyllable.has(p.id));
        if (allFailed) {
          this.state.currentSyllable = getWeightedRandomSyllable(
            this.threeProbability,
            this.state.currentSyllable
          );
          this.failedCurrentSyllable.clear();
        }

        this.broadcast();
        this.startTick(this.currentBombDuration);
      }
    }, 3_500);
  }

  private endGame(): void {
    this.clearTick();
    this.state.phase = 'GAME_OVER';
    this.state.currentBombHolder = null;

    const alive = this.alivePlayers();
    let winner: Player | null = null;

    if (alive.length === 1) {
      winner = alive[0];
    } else {
      const sorted = [...this.state.players].sort((a, b) => b.wordsAnswered - a.wordsAnswered);
      winner = sorted[0] ?? null;
    }

    // Rank all players for Elo calculation
    if (this.isRanked) {
      // Rankings: winner first, then elimination order in reverse
      const rankedPlayers: { username: string; place: number }[] = [];

      // 1. Winner
      if (winner) rankedPlayers.push({ username: winner.username, place: 1 });

      // 2. Others in reverse elimination order
      const others = [...this.eliminatedPlayers].reverse();
      others.forEach((id, index) => {
        const p = this.state.players.find((pl) => pl.id === id);
        if (p && p.id !== winner?.id) {
          rankedPlayers.push({ username: p.username, place: rankedPlayers.length + 1 });
        }
      });

      const { updateElo } = require('./leaderboard');
      const eloChanges = updateElo(rankedPlayers);
      this.emit('game_over', {
        winner: winner?.id ?? null,
        scores: this.state.players,
        eloChanges,
      });
    } else {
      this.emit('game_over', { winner: winner?.id ?? null, scores: this.state.players });
    }
    this.broadcast();
  }

  private broadcast(): void {
    this.emit('state_update', this.getState());
  }

  private alivePlayers(): Player[] {
    return this.state.players.filter((p) => p.alive);
  }

  private randomAliveExcept(excludeId: string | null): string {
    const candidates = this.state.players.filter((p) => p.alive && p.id !== excludeId);
    if (candidates.length === 0) {
      const any = this.state.players.filter((p) => p.alive);
      return any[Math.floor(Math.random() * any.length)]?.id ?? '';
    }
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  emit<K extends keyof GameRoomEvents>(event: K, ...args: GameRoomEvents[K]): boolean {
    return super.emit(event as string, ...args);
  }
}
