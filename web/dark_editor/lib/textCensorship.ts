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

// Common profanity words to detect and censor from dictionary
const PROFANITY_LIST = ALL_PROFANITIES;

// Words that should never be censored (false positives)
const ALLOWED_WORDS = [
  'shift', 'shifting', 'shifter', 'shifty', 'shimmer', 'shimmering',
  'assessment', 'assistant', 'assume', 'assumption',
  'hello', 'hellish', 'hells', 'helluva',
  'dickens', 'dickinson', 'dickensian'
];

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
    
    const lowerWord = word.toLowerCase();
    
    // Check if word is in profanity list
    const isProfanity = PROFANITY_LIST.some(profane => {
      // Check for exact match or word boundaries
      const regex = new RegExp(`\\b${profane}\\b`, 'i');
      return regex.test(word);
    });
    
    // Check if word should be allowed (false positives)
    const isAllowed = ALLOWED_WORDS.some(allowed => {
      const regex = new RegExp(`\\b${allowed}\\b`, 'i');
      return regex.test(word);
    });
    
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
  return PROFANITY_LIST.some(profane => {
    const regex = new RegExp(`\\b${profane}\\b`, 'i');
    return regex.test(lowerText);
  });
}

// Utility function to get profanity count
export function getProfanityCount(text: string): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  
  PROFANITY_LIST.forEach(profane => {
    const regex = new RegExp(`\\b${profane}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  });
  
  return count;
}

// Utility function to get all profanity words found in text
export function getProfanityWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  
  PROFANITY_LIST.forEach(profane => {
    const regex = new RegExp(`\\b${profane}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      foundWords.push(...matches);
    }
  });
  
  return Array.from(new Set(foundWords)); // Remove duplicates
}

// Export default config
export const DEFAULT_CENSORSHIP_CONFIG = DEFAULT_CONFIG;