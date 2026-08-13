import { describe, it, expect, vi } from 'vitest';
import {
  censorText,
  hasProfanity,
  getProfanityCount,
  getProfanityWords,
  DEFAULT_CENSORSHIP_CONFIG,
} from '@/lib/textCensorship';

describe('censorText', () => {
  it('returns unchanged text when censorship is disabled', () => {
    const text = 'this is a damn good day';
    expect(censorText(text, { enabled: false })).toBe(text);
  });

  it('censors profanity while leaving safe words intact', () => {
    const result = censorText('this is damn good', { ...DEFAULT_CENSORSHIP_CONFIG, censorThreshold: 100 });
    expect(result.toLowerCase()).not.toContain('damn');
    expect(result).toContain('this');
    expect(result).toContain('good');
  });

  it('does not censor allowed false positives', () => {
    expect(censorText('Shift the assessment to hello', DEFAULT_CENSORSHIP_CONFIG)).toBe(
      'Shift the assessment to hello'
    );
  });

  it('uses default config when no config is provided', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const result = censorText('damn good');
      expect(result.toLowerCase()).not.toContain('damn');
    } finally {
      randomSpy.mockRestore();
    }
  });
});

describe('hasProfanity', () => {
  it('returns true for text containing profanity', () => {
    expect(hasProfanity('this is damn bad')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(hasProfanity('this is a good day')).toBe(false);
  });
});

describe('getProfanityCount', () => {
  it('counts profane words in text', () => {
    expect(getProfanityCount('damn damn good')).toBe(2);
  });
});

describe('getProfanityWords', () => {
  it('returns unique profane words found', () => {
    const words = getProfanityWords('damn damn bad');
    expect(words.length).toBeLessThanOrEqual(2);
    expect(words.some((w) => w.toLowerCase() === 'damn')).toBe(true);
  });
});

describe('preserved semantics (Set lookups + precompiled regexes)', () => {
  it('keeps counting duplicate dictionary entries across languages', () => {
    // 'merda' is listed in it and pt
    expect(getProfanityCount('merda')).toBe(2);
  });

  it('counts a word and an overlapping phrase separately', () => {
    // 'fucked' (word) + 'fucked up' (phrase), matching the old per-entry scan
    expect(getProfanityCount('fucked up')).toBe(2);
  });

  it('detects multi-word phrases in whole-text scans', () => {
    expect(hasProfanity('you son of a bitch')).toBe(true);
    expect(getProfanityWords('you son of a bitch')).toContain('son of a bitch');
    // 'bitch' matches inside the phrase too, like the old per-entry regexes
    expect(getProfanityCount('son of a bitch')).toBe(2);
  });

  it('detects accented entries via whole-text regexes', () => {
    expect(hasProfanity('cabrón')).toBe(true);
    expect(getProfanityCount('cabrón')).toBe(1);
  });

  it('respects word boundaries and does not count substrings', () => {
    // 'shit' must not count inside 'shitty' (which is its own entry)
    expect(getProfanityCount('shitty')).toBe(1);
    expect(hasProfanity('scrap metal')).toBe(false); // contains 'crap'
  });

  it('is case-insensitive', () => {
    expect(getProfanityCount('DAMN Damn damn')).toBe(3);
    expect(hasProfanity('HELL')).toBe(true);
  });

  it('does not censor words that merely contain profanity', () => {
    const result = censorText('this is scrap metal', DEFAULT_CENSORSHIP_CONFIG);
    expect(result).toContain('scrap');
    const censored = censorText('this is crap metal', { ...DEFAULT_CENSORSHIP_CONFIG, censorThreshold: 100 });
    expect(censored.toLowerCase()).not.toContain('crap');
  });
});
