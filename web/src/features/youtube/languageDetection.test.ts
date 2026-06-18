/**
 * Language Detection Tests
 * 
 * Table-driven tests for detectLanguage function.
 * Tests all language patterns and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { detectLanguage, type LanguageCode } from './languageDetection';

// Test case type
interface LanguageTestCase {
  name: string;
  channelName: string;
  channelTitle?: string;
  expected: LanguageCode;
}

// Italian test cases
const italianTests: LanguageTestCase[] = [
  { name: 'Boxe ITA', channelName: 'Boxe_ITA', expected: 'it' },
  { name: 'Boxe It', channelName: 'Boxe It', expected: 'it' },
  { name: 'Channel it', channelName: 'Channel it', expected: 'it' },
  { name: 'ITA suffix', channelName: 'ChannelITA', expected: 'it' },
  { name: 'Channel ITA', channelName: 'Channel ITA', expected: 'it' },
  { name: 'italia in title', channelName: 'SportsChannel', channelTitle: 'italia sports', expected: 'it' },
  { name: 'italiano in title', channelName: 'Channel', channelTitle: 'italiano', expected: 'it' },
];

// Spanish test cases
const spanishTests: LanguageTestCase[] = [
  { name: 'Boxe Es', channelName: 'Boxe_Es', expected: 'es' },
  { name: 'Channel Es', channelName: 'Channel Es', expected: 'es' },
  { name: 'ES suffix', channelName: 'CHANNEL ES', expected: 'es' },
  { name: 'ESP suffix', channelName: 'Channel ESP', expected: 'es' },
  { name: 'españa in title', channelName: 'Sports', channelTitle: 'españa deportes', expected: 'es' },
  { name: 'español in title', channelName: 'Channel', channelTitle: 'español', expected: 'es' },
];

// French test cases
const frenchTests: LanguageTestCase[] = [
  { name: 'Boxe Fr', channelName: 'Boxe_Fr', expected: 'fr' },
  { name: 'Channel Fr', channelName: 'Channel Fr', expected: 'fr' },
  { name: 'FR suffix', channelName: 'CHANNEL FR', expected: 'fr' },
  { name: 'france in title', channelName: 'Sports', channelTitle: 'france sports', expected: 'fr' },
  { name: 'français in title', channelName: 'Channel', channelTitle: 'français', expected: 'fr' },
];

// German test cases
const germanTests: LanguageTestCase[] = [
  { name: 'Boxe De', channelName: 'Boxe_De', expected: 'de' },
  { name: 'Channel De', channelName: 'Channel De', expected: 'de' },
  { name: 'DE suffix', channelName: 'CHANNEL DE', expected: 'de' },
  { name: 'deutsch in title', channelName: 'Channel', channelTitle: 'deutsch sports', expected: 'de' },
];

// Portuguese test cases
const portugueseTests: LanguageTestCase[] = [
  { name: 'Boxe Pt', channelName: 'Boxe_Pt', expected: 'pt' },
  { name: 'Channel Pt', channelName: 'Channel Pt', expected: 'pt' },
  { name: 'PT suffix', channelName: 'CHANNEL PT', expected: 'pt' },
  { name: 'BR suffix', channelName: 'Channel_BR', expected: 'pt' },
  { name: 'BR upper', channelName: 'CHANNEL BR', expected: 'pt' },
  { name: 'brasil in title', channelName: 'Sports', channelTitle: 'brasil esportes', expected: 'pt' },
  { name: 'português in title', channelName: 'Channel', channelTitle: 'português', expected: 'pt' },
];

// English test cases
const englishTests: LanguageTestCase[] = [
  { name: 'Channel En', channelName: 'Channel_En', expected: 'en' },
  { name: 'Channel US', channelName: 'Channel_US', expected: 'en' },
  { name: 'Channel UK', channelName: 'Channel_UK', expected: 'en' },
  { name: 'Channel en', channelName: 'Channel en', expected: 'en' },
  { name: 'english in title', channelName: 'Sports', channelTitle: 'english sports', expected: 'en' },
];

// Indian/Hindi test cases
const indianTests: LanguageTestCase[] = [
  { name: 'Boxe IND', channelName: 'Boxe IND', expected: 'hi' },
  { name: 'Channel_IND', channelName: 'Channel_IND', expected: 'hi' },
  { name: 'Channel Ind', channelName: 'Channel Ind', expected: 'hi' },
  { name: 'india in name', channelName: 'india sports', expected: 'hi' },
  { name: 'india in title', channelName: 'Sports', channelTitle: 'india cricket', expected: 'hi' },
  { name: 'Channel ind', channelName: 'Channel ind', expected: 'hi' },
];

// Indonesian test cases
const indonesianTests: LanguageTestCase[] = [
  { name: 'indonesia in name', channelName: 'indonesia sports', expected: 'id' },
  { name: 'Channel_id', channelName: 'Channel_id', expected: 'id' },
];

// Russian test cases
const russianTests: LanguageTestCase[] = [
  { name: 'Boxe Ru', channelName: 'Boxe_Ru', expected: 'ru' },
  { name: 'Channel Ru', channelName: 'Channel Ru', expected: 'ru' },
  { name: 'RU suffix', channelName: 'CHANNEL RU', expected: 'ru' },
  { name: 'russia in name', channelName: 'russia sports', expected: 'ru' },
];

// Polish test cases
const polishTests: LanguageTestCase[] = [
  { name: 'Boxe Pl', channelName: 'Boxe_Pl', expected: 'pl' },
  { name: 'Channel Pol', channelName: 'Channel Pol', expected: 'pl' },
  { name: 'POL suffix', channelName: 'CHANNEL POL', expected: 'pl' },
  { name: 'PL suffix', channelName: 'CHANNEL PL', expected: 'pl' },
  { name: 'polski in title', channelName: 'Channel', channelTitle: 'polski sport', expected: 'pl' },
];

// Turkish test cases
const turkishTests: LanguageTestCase[] = [
  { name: 'Boxe Tr', channelName: 'Boxe_Tr', expected: 'tr' },
  { name: 'Channel Tr', channelName: 'Channel Tr', expected: 'tr' },
  { name: 'TR suffix', channelName: 'CHANNEL TR', expected: 'tr' },
  { name: 'turkey in name', channelName: 'turkey sports', expected: 'tr' },
];

// Japanese test cases
const japaneseTests: LanguageTestCase[] = [
  { name: 'Channel Jp', channelName: 'Channel_Jp', expected: 'ja' },
  { name: 'Channel JP', channelName: 'Channel JP', expected: 'ja' },
  { name: 'japan in name', channelName: 'japan sports', expected: 'ja' },
];

// Korean test cases
const koreanTests: LanguageTestCase[] = [
  { name: 'Channel Kr', channelName: 'Channel_Kr', expected: 'ko' },
  { name: 'Channel KR', channelName: 'CHANNEL KR', expected: 'ko' },
  { name: 'korea in name', channelName: 'korea sports', expected: 'ko' },
];

// Chinese test cases
const chineseTests: LanguageTestCase[] = [
  { name: 'Channel Cn', channelName: 'Channel_Cn', expected: 'zh' },
  { name: 'Channel CN', channelName: 'CHANNEL CN', expected: 'zh' },
  { name: 'china in name', channelName: 'china sports', expected: 'zh' },
];

// Unknown/fallback test cases
const unknownTests: LanguageTestCase[] = [
  { name: 'Random channel', channelName: 'RandomChannel', expected: 'unknown' },
  { name: 'Generic name', channelName: 'Sports Channel', expected: 'unknown' },
  { name: 'Numbers only', channelName: 'Channel123', expected: 'unknown' },
];

// Run all tests
describe('detectLanguage', () => {
  describe('Italian detection', () => {
    italianTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Spanish detection', () => {
    spanishTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('French detection', () => {
    frenchTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('German detection', () => {
    germanTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Portuguese detection', () => {
    portugueseTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('English detection', () => {
    englishTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Indian/Hindi detection', () => {
    indianTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Indonesian detection', () => {
    indonesianTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Russian detection', () => {
    russianTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Polish detection', () => {
    polishTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Turkish detection', () => {
    turkishTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Japanese detection', () => {
    japaneseTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Korean detection', () => {
    koreanTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Chinese detection', () => {
    chineseTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  describe('Unknown/fallback', () => {
    unknownTests.forEach(({ name, channelName, channelTitle, expected }) => {
      it(name, () => {
        expect(detectLanguage(channelName, channelTitle)).toBe(expected);
      });
    });
  });

  // Ambiguous cases
  describe('Ambiguous cases', () => {
    it('IND takes precedence over ID when both patterns match', () => {
      // IND should match before ID
      expect(detectLanguage('ChannelIND')).toBe('hi');
    });

    it('De suffix should match German not Indonesian', () => {
      expect(detectLanguage('Channel_De')).toBe('de');
    });
  });
});
