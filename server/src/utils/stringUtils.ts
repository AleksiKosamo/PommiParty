/**
 * String utility functions for server-side processing
 */

/**
 * Normalize a word for comparison and validation.
 * Converts to lowercase, removes extra whitespace, and strips accents.
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Validate a username for content policy.
 * Returns null if invalid, sanitized username if valid.
 */
export function sanitizeUsername(
  input: string,
  maxLength: number = 20,
  bannedFragments: string[] = []
): string | null {
  const username = input.trim().slice(0, maxLength);
  if (!username) return null;

  const normalized = username.toLowerCase();
  if (bannedFragments.some((fragment) => normalized.includes(fragment))) {
    return null;
  }

  return username;
}

/**
 * Check if a string contains valid Finnish characters.
 */
export function isValidFinnishText(text: string): boolean {
  return /^[a-zäöåA-ZÄÖÅ\s\-']+$/.test(text);
}
