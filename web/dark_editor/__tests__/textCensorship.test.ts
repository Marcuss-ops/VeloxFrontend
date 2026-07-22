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
