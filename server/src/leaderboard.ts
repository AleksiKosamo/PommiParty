import fs from 'fs';
import path from 'path';
import { Difficulty } from './types';
import { logger } from './logger';

export interface RankingEntry {
  username: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  lastPlayed: string;
}

export interface SoloRankingEntry {
  score: number;
  durationMs: number;
  date: string;
  difficulty: Difficulty;
}

const RANKINGS_FILE = path.join(__dirname, '../data/rankings.json');
const SOLO_RANKINGS_FILE = path.join(__dirname, '../data/solo_rankings.json');
const DEFAULT_ELO = 1000;
const K_FACTOR = 32;

// Map of username -> RankingEntry
let rankings: Record<string, RankingEntry> = {};
let soloRankings: SoloRankingEntry[] = [];

export function loadRankings(): void {
  try {
    if (fs.existsSync(RANKINGS_FILE)) {
      const raw = fs.readFileSync(RANKINGS_FILE, 'utf-8');
      rankings = JSON.parse(raw);
    }
  } catch (err) {
    logger.error('[Rankings] Failed to load multiplayer rankings:', err);
  }

  try {
    if (fs.existsSync(SOLO_RANKINGS_FILE)) {
      const raw = fs.readFileSync(SOLO_RANKINGS_FILE, 'utf-8');
      const parsed: any[] = JSON.parse(raw);
      soloRankings = parsed.map((entry) => ({
        score: entry.score ?? 0,
        durationMs: entry.durationMs ?? 0,
        date: entry.date ?? new Date().toISOString().slice(0, 10),
        difficulty: entry.difficulty ?? 'NORMAL',
      }));
    }
  } catch (err) {
    logger.error('[Rankings] Failed to load solo rankings:', err);
  }
}

function save(): void {
  try {
    const data = JSON.stringify(rankings, null, 2);
    const dir = path.dirname(RANKINGS_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = RANKINGS_FILE + '.tmp';
    fs.writeFileSync(tmp, data, 'utf-8');
    fs.renameSync(tmp, RANKINGS_FILE);
  } catch (err) {
    logger.error('[Rankings] Failed to save multiplayer:', err);
  }
}

function saveSolo(): void {
  try {
    const data = JSON.stringify(soloRankings, null, 2);
    const dir = path.dirname(SOLO_RANKINGS_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = SOLO_RANKINGS_FILE + '.tmp';
    fs.writeFileSync(tmp, data, 'utf-8');
    fs.renameSync(tmp, SOLO_RANKINGS_FILE);
  } catch (err) {
    logger.error('[Rankings] Failed to save solo:', err);
  }
}

export function getElo(username: string): number {
  return rankings[username]?.elo ?? DEFAULT_ELO;
}

export function getTopRankings(limit = 10): RankingEntry[] {
  return Object.values(rankings)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
}

/**
 * Update Elo based on multi-player match results.
 * @param results List of players ordered by performance (1st place, 2nd place, etc.)
 */
export function updateElo(results: { username: string; place: number }[]): Record<string, number> {
  const eloChanges: Record<string, number> = {};
  const n = results.length;
  if (n < 2) return {};

  const oldElos = results.map((r) => ({
    username: r.username,
    elo: getElo(r.username),
  }));

  // Calculate change for each player relative to every other player
  for (let i = 0; i < n; i++) {
    let totalChange = 0;
    const playerA = results[i];
    const eloA = oldElos[i].elo;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const playerB = results[j];
      const eloB = oldElos[j].elo;

      // Expected score for A against B
      const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));

      // Actual score (1 for win, 0 for loss)
      // Note: place is 1-based, lower place is better
      const actualA = playerA.place < playerB.place ? 1 : 0;

      totalChange += K_FACTOR * (actualA - expectedA);
    }

    // Average the change across all opponents
    const avgChange = Math.round(totalChange / (n - 1));
    eloChanges[playerA.username] = avgChange;

    // Update the profile
    if (!rankings[playerA.username]) {
      rankings[playerA.username] = {
        username: playerA.username,
        elo: DEFAULT_ELO,
        gamesPlayed: 0,
        wins: 0,
        lastPlayed: '',
      };
    }

    const profile = rankings[playerA.username];
    profile.elo += avgChange;
    profile.gamesPlayed += 1;
    if (playerA.place === 1) profile.wins += 1;
    profile.lastPlayed = new Date().toISOString().slice(0, 10);
  }

  save();
  return eloChanges;
}

export function updateSoloScore(score: number, durationMs: number, difficulty: Difficulty): boolean {
  if (score <= 0) return false;

  soloRankings.push({
    score,
    durationMs,
    date: new Date().toISOString().slice(0, 10),
    difficulty,
  });

  soloRankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.durationMs - b.durationMs;
  });

  // Keep top 100 overall, then filters happen at query time
  if (soloRankings.length > 100) soloRankings = soloRankings.slice(0, 100);
  saveSolo();
  return true;
}

export function getTopSoloRankings(difficulty?: Difficulty, limit = 10): SoloRankingEntry[] {
  const filtered = difficulty
    ? soloRankings.filter((r) => r.difficulty === difficulty)
    : soloRankings;
  return filtered.slice(0, limit);
}

// Backward compatibility for index.ts for now (will refactor index.ts next)
export function getLeaderboard() {
  return getTopRankings().map((r) => ({
    username: r.username,
    score: r.elo, // map elo to score for frontend
    date: r.lastPlayed,
  }));
}
