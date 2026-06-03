import fs from 'fs';
import path from 'path';
import { logger } from './logger';

let wordSet: Set<string>;
const wiktCache = new Map<string, boolean>();
let twoLetterSyllables: string[] = [];
let threeLetterSyllables: string[] = [];
let commonSyllables: string[] = [];
let voikkoInstance: any = null;

export async function loadDictionary(): Promise<void> {
  try {
    const { Voikko } = await new Function('return import("@yongsk0066/voikko")')();
    voikkoInstance = await Voikko.init({ lang: 'fi' });
  } catch (err) {
    logger.error('[Dictionary] Failed to load Voikko:', err);
  }

  try {
    const filePath = path.join(__dirname, '../data/words.txt');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const words = raw
      .split(/\r?\n/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    wordSet = new Set(words);

    // Generate dynamic syllables
    const counts = new Map<string, number>();
    for (const w of words) {
      if (w.length < 3) continue;
      for (const len of [2, 3]) {
        for (let i = 0; i <= w.length - len; i++) {
          const sub = w.substring(i, i + len);
          if (/^[a-zäöå]+$/.test(sub)) {
            counts.set(sub, (counts.get(sub) ?? 0) + 1);
          }
        }
      }
    }

    const sorted = [...counts.entries()]
      .filter(([, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1]);

    // Split into separate lists by length
    twoLetterSyllables = sorted
      .filter(([s]) => s.length === 2)
      .slice(0, 100)
      .map((x) => x[0]);
    threeLetterSyllables = sorted
      .filter(([s]) => s.length === 3)
      .slice(0, 80)
      .map((x) => x[0]);
    commonSyllables = [...twoLetterSyllables, ...threeLetterSyllables];
  } catch (err) {
    logger.warn('[Dictionary] Could not load words.txt, falling back to defaults.', err);
    wordSet = new Set();
  }

  if (commonSyllables.length === 0) {
    twoLetterSyllables = ['ka', 'ta', 'sa', 'la'];
    commonSyllables = twoLetterSyllables;
  }

  logger.info(
    `[Dictionary] Loaded ${wordSet.size} seed words. 2-letter: ${twoLetterSyllables.length}, 3-letter: ${threeLetterSyllables.length}`
  );
}

/** Basic random syllable from combined pool (backward-compat). */
export function getRandomSyllable(exclude = ''): string {
  if (commonSyllables.length === 0) return 'ka';
  let s: string;
  do {
    s = commonSyllables[Math.floor(Math.random() * commonSyllables.length)];
  } while (s === exclude && commonSyllables.length > 1);
  return s;
}

/**
 * Weighted random syllable.
 * @param threeProbability  0–1 chance of picking a 3-letter syllable.
 * @param exclude           Previous syllable to avoid repeating.
 */
export function getWeightedRandomSyllable(threeProbability: number, exclude = ''): string {
  const useThree = Math.random() < threeProbability && threeLetterSyllables.length > 0;
  const pool = useThree
    ? threeLetterSyllables
    : twoLetterSyllables.length > 0
      ? twoLetterSyllables
      : commonSyllables;
  let s: string;
  do {
    s = pool[Math.floor(Math.random() * pool.length)];
  } while (s === exclude && pool.length > 1);
  return s;
}

export function containsSyllable(word: string, syllable: string): boolean {
  return word.toLowerCase().includes(syllable.toLowerCase());
}

export function isInLocalList(word: string): boolean {
  return wordSet?.has(word.trim().toLowerCase()) ?? false;
}

export async function isValidFinnishWordAsync(word: string): Promise<boolean> {
  const lower = word.trim().toLowerCase();

  if (wordSet?.has(lower)) return true;
  if (wiktCache.has(lower)) return wiktCache.get(lower)!;

  if (voikkoInstance) {
    const exists = voikkoInstance.spell(lower);
    wiktCache.set(lower, exists);
    if (exists) logger.debug(`[Dictionary] ✓ Voikko: "${lower}"`);
    return exists;
  }

  return false;
}
