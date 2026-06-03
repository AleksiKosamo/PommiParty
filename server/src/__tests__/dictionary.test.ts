/**
 * Unit tests for dictionary utilities
 */

import { containsSyllable, isInLocalList, getRandomSyllable } from '../src/dictionary';

describe('Dictionary Functions', () => {
  describe('containsSyllable', () => {
    it('should find a syllable in a word', () => {
      expect(containsSyllable('kissa', 'is')).toBe(true);
      expect(containsSyllable('koulu', 'ou')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(containsSyllable('KISSA', 'is')).toBe(true);
      expect(containsSyllable('kissa', 'IS')).toBe(true);
    });

    it('should return false when syllable is not in word', () => {
      expect(containsSyllable('kissa', 'xy')).toBe(false);
      expect(containsSyllable('koulu', 'zz')).toBe(false);
    });

    it('should handle special Finnish characters', () => {
      expect(containsSyllable('käytä', 'äy')).toBe(true);
      expect(containsSyllable('öljy', 'öl')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(containsSyllable('', 'ab')).toBe(false);
      expect(containsSyllable('kissa', '')).toBe(true);
    });
  });

  describe('getRandomSyllable', () => {
    it('should return a string', () => {
      const syllable = getRandomSyllable();
      expect(typeof syllable).toBe('string');
      expect(syllable.length).toBeGreaterThan(0);
    });

    it('should avoid excluded syllable', () => {
      const exclude = 'ka';
      const attempts = 50;
      let avoided = true;
      for (let i = 0; i < attempts; i++) {
        const result = getRandomSyllable(exclude);
        if (result === exclude) {
          avoided = false;
          break;
        }
      }
      // With multiple syllables available, avoiding one should usually work
      // though we can't guarantee it with randomness
      expect(avoided).toBe(true);
    });
  });

  describe('isInLocalList', () => {
    it('should return boolean', () => {
      const result = isInLocalList('kissa');
      expect(typeof result).toBe('boolean');
    });

    it('should handle empty input', () => {
      const result = isInLocalList('');
      expect(typeof result).toBe('boolean');
    });

    it('should be case-insensitive', () => {
      const result1 = isInLocalList('KISSA');
      const result2 = isInLocalList('kissa');
      expect(result1).toBe(result2);
    });

    it('should handle whitespace', () => {
      const result1 = isInLocalList('  kissa  ');
      const result2 = isInLocalList('kissa');
      expect(result1).toBe(result2);
    });
  });
});
