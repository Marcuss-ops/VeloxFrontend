// Text Censorship and Translation System
// Converts profanity to censored versions with random character replacement
import { ALL_PROFANITIES } from './profanityDictionary';

export interface CensorshipConfig {
  enabled: boolean;
  replacementChars: string[];
  censorThreshold: number; // 1-100, higher = more aggressive
}

const DEFAULT_CONFIG: CensorshipConfig = {
  enabled: true,
  replacementChars: ['!', '#', '@', '$', '%'],
  censorThreshold: 50,
};

// Words that should never be censored (false positives)
const ALLOWED_WORDS = [
  'shift', 'shifting', 'shifter', 'shifty', 'shimmer', 'shimmering',
  'assessment', 'assistant', 'assume', 'assumption',
  'hello', 'hellish', 'hells', 'helluva',
  'dickens', 'dickinson', 'dickensian'
];

// Precomputed lookups, built once at module load instead of constructing a
// RegExp per profanity entry inside every loop:
//
// - Plain word tokens (ASCII [a-z0-9_]+) can be matched with O(1) Set/Map
//   lookups: a `\bword\b` regex on a single word token matches exactly when
//   the lowercased token is an entry, so the regex is unnecessary. The Map
//   keeps the multiplicity so duplicate entries across languages (e.g.
//   "merda" in it/pt) keep counting like the old per-entry regex scan.
// - Phrases and accented/non-Latin entries cannot match a single token and
//   must run against the whole text; their regexes are precompiled once.
const PROFANITY_TOKEN_MULT = new Map<string, number>();
const PROFANITY_REGEX_MAP = new Map<string, RegExp>();
for (const profane of ALL_PROFANITIES) {
  const lower = profane.toLowerCase();
  if (/^[a-z0-9_]+$/.test(lower)) {
    PROFANITY_TOKEN_MULT.set(lower, (PROFANITY_TOKEN_MULT.get(lower) ?? 0) + 1);
  } else {
    PROFANITY_REGEX_MAP.set(profane, new RegExp(`\\b${profane}\\b`, 'gi'));
  }
}
const PROFANITY_TOKEN_SET = new Set(PROFANITY_TOKEN_MULT.keys());

const ALLOWED_SET = new Set(ALLOWED_WORDS.map(w => w.toLowerCase()));

// Split text into word tokens (runs of \w), mirroring the boundary semantics
// of the previous per-entry `\bword\b` regexes.
function tokenize(text: string): string[] {
  return text.split(/[^\w]+/).filter(Boolean);
}

export function censorText(text: string, config: Partial<CensorshipConfig> = {}): string {
  if (!config.enabled && config.enabled !== undefined) {
    return text;
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Split text into words and punctuation
  const words = text.split(/(\s+|[^\w\s])/);
  
  return words.map(word => {
    // Skip if it's whitespace or punctuation
    if (!word.trim() || !/^[a-zA-Z]/.test(word)) {
      return word;
    }
    
    // Normalize once per word and use exact lookups instead of building a
    // RegExp for every profanity/allowed entry.
    const lower = word.toLowerCase();
    const isProfanity = PROFANITY_TOKEN_SET.has(lower);
    const isAllowed = ALLOWED_SET.has(lower);
    
    if (isProfanity && !isAllowed) {
      return censorWord(word, finalConfig);
    }
    
    return word;
  }).join('');
}

function censorWord(word: string, config: CensorshipConfig): string {
  const isCapitalized = word.charAt(0) === word.charAt(0).toUpperCase();
  const isAllCaps = word === word.toUpperCase();
  
  // Get the base word without punctuation
  const cleanWord = word.replace(/[^a-zA-Z]/g, '');
  const punctuation = word.replace(/[a-zA-Z]/g, '');
  
  if (cleanWord.length <= 2) {
    // For very short words, replace with symbols
    const replacement = generateReplacement(cleanWord.length, config);
    return isAllCaps ? replacement.toUpperCase() : 
           isCapitalized ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : 
           replacement;
  }
  
  // For longer words, censor some characters
  let censored = '';
  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    
    // Always keep first character
    if (i === 0) {
      censored += char;
    } 
    // Always keep last character if word is long enough
    else if (i === cleanWord.length - 1 && cleanWord.length > 3) {
      censored += char;
    }
    // Randomly censor middle characters based on threshold
    else {
      const shouldCensor = Math.random() * 100 < config.censorThreshold;
      if (shouldCensor) {
        censored += getRandomChar(config.replacementChars);
      } else {
        censored += char;
      }
    }
  }
  
  // Add back punctuation
  censored += punctuation;
  
  // Apply capitalization
  if (isAllCaps) {
    return censored.toUpperCase();
  } else if (isCapitalized) {
    return censored.charAt(0).toUpperCase() + censored.slice(1).toLowerCase();
  }
  
  return censored.toLowerCase();
}

function generateReplacement(length: number, config: CensorshipConfig): string {
  let replacement = '';
  for (let i = 0; i < length; i++) {
    replacement += getRandomChar(config.replacementChars);
  }
  return replacement;
}

function getRandomChar(chars: string[]): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

// Utility function to check if text contains profanity
export function hasProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const token of tokenize(lowerText)) {
    if (PROFANITY_TOKEN_SET.has(token)) {
      return true;
    }
  }
  for (const regex of PROFANITY_REGEX_MAP.values()) {
    if (lowerText.match(regex)) {
      return true;
    }
  }
  return false;
}

// Utility function to get profanity count
export function getProfanityCount(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;

  // Token entries: O(tokens) exact lookups, keeping the per-dictionary-entry
  // multiplicity so counts match the previous per-entry regex scan.
  for (const token of tokenize(lowerText)) {
    count += PROFANITY_TOKEN_MULT.get(token) ?? 0;
  }

  // Phrase/accented entries: precompiled whole-text regexes.
  for (const regex of PROFANITY_REGEX_MAP.values()) {
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

// Utility function to get all profanity words found in text
export function getProfanityWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const tokens = new Set(tokenize(lowerText));
  const foundWords: string[] = [];

  // Iterate the dictionary in its original order so duplicates collapse to
  // their first occurrence, matching the previous per-entry scan.
  for (const profane of ALL_PROFANITIES) {
    const lower = profane.toLowerCase();
    if (PROFANITY_TOKEN_SET.has(lower)) {
      if (tokens.has(lower)) {
        foundWords.push(lower);
      }
    } else if (lowerText.match(PROFANITY_REGEX_MAP.get(profane)!)) {
      foundWords.push(lower);
    }
  }

  return Array.from(new Set(foundWords)); // Remove duplicates
}

// Export default config
export const DEFAULT_CENSORSHIP_CONFIG = DEFAULT_CONFIG;
