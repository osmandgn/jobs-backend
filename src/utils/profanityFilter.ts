/**
 * Profanity Filter Utility
 * Basic profanity check for reviews and user-generated content
 */

// Common profanity words list (UK English focused)
// This is a basic list - in production, use a more comprehensive library
const PROFANITY_WORDS = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fucks',
  'shit', 'shitting', 'shitty', 'shits',
  'ass', 'asshole', 'arsehole', 'arse',
  'bitch', 'bitches', 'bitching',
  'damn', 'damned',
  'crap', 'crappy',
  'bastard', 'bastards',
  'dick', 'dickhead',
  'piss', 'pissed', 'pissing',
  'wanker', 'wanking', 'wank',
  'bollocks', 'bollox',
  'twat', 'twats',
  'cunt', 'cunts',
  'cock', 'cocksucker',
  'slut', 'sluts', 'slutty',
  'whore', 'whores',
  'nigger', 'nigga', 'niggers',
  'faggot', 'fag', 'faggots',
  'retard', 'retarded', 'retards',
  'spastic', 'spaz',
  'scum', 'scumbag',
];

// Regex patterns for common evasion techniques
const EVASION_PATTERNS = [
  /f+u+c+k+/gi,
  /s+h+i+t+/gi,
  /a+s+s+h+o+l+e+/gi,
  /b+i+t+c+h+/gi,
  /c+u+n+t+/gi,
  /w+a+n+k+e*r*/gi,
  /t+w+a+t+/gi,
];

/**
 * Check if text contains profanity
 * @param text - Text to check
 * @returns true if profanity found
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // Check against word list
  for (const word of PROFANITY_WORDS) {
    // Word boundary check to avoid false positives
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
  }

  // Check against evasion patterns
  for (const pattern of EVASION_PATTERNS) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  return false;
}

/**
 * Get list of profanity words found in text
 * @param text - Text to check
 * @returns Array of found profanity words
 */
export function findProfanity(text: string): string[] {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      found.push(...matches);
    }
  }

  return [...new Set(found)]; // Remove duplicates
}

/**
 * Censor profanity in text by replacing with asterisks
 * @param text - Text to censor
 * @returns Censored text
 */
export function censorProfanity(text: string): string {
  if (!text) return text;

  let result = text;

  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      if (match.length <= 2) return '*'.repeat(match.length);
      return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
  }

  return result;
}

/**
 * Check text for inappropriate content
 * Returns validation result with details
 */
export interface ProfanityCheckResult {
  isClean: boolean;
  foundWords: string[];
  message?: string;
}

export function checkProfanity(text: string): ProfanityCheckResult {
  const foundWords = findProfanity(text);

  return {
    isClean: foundWords.length === 0,
    foundWords,
    message: foundWords.length > 0
      ? 'Yorumunuz uygunsuz içerik barındırıyor. Lütfen düzenleyiniz.'
      : undefined,
  };
}

export default {
  containsProfanity,
  findProfanity,
  censorProfanity,
  checkProfanity,
};
