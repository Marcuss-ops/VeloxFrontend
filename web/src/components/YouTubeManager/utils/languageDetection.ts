// Language detection utilities for YouTube channels

// Language emoji mapping based on channel name patterns
export const getLanguageFromName = (channelName: string, channelTitle?: string): string => {
    // Skip raw channel IDs
    if (channelName.startsWith('UC') && channelName.length === 24) {
        return 'unknown';
    }

    const title = (channelTitle || '').toLowerCase();
    const upperName = channelName.toUpperCase();

    // Check for Indian/Hindi patterns - "IND", "Ind" suffix
    if (/\bind$/i.test(channelName) || / ind$/i.test(channelName) || /_ind$/i.test(channelName) ||
        /\bindia\b/i.test(channelName) || /\bindia\b/i.test(title) ||
        / ind\s*$/i.test(channelName) || upperName.endsWith(' IND') ||
        upperName.endsWith('IND') && channelName.length > 3) return 'hi';

    // Check for Indonesian patterns
    if (/\bindonesia\b/i.test(channelName) || /_id$/i.test(channelName) ||
        /\bid$/i.test(channelName) && !/\bind$/i.test(channelName)) return 'id';

    // Check for Italian patterns - "ITA", "It", "ITA" suffix
    if (/_it$/i.test(channelName) || / it$/i.test(channelName) || /\bita\b/i.test(channelName) ||
        /\bitalia\b/i.test(channelName) || /\bitaliano\b/i.test(title) ||
        upperName.endsWith(' ITA') || upperName.endsWith('ITA') ||
        /It$/.test(channelName) || /\sIt$/.test(channelName)) return 'it';

    // Check for Spanish patterns - "Es", "Esp" suffix
    if (/_es$/i.test(channelName) || / es$/i.test(channelName) || /\besp\b/i.test(channelName) ||
        /\bespaña\b/i.test(channelName) || /\bespañol\b/i.test(title) ||
        /Es$/.test(channelName) || /\sEs$/.test(channelName) ||
        upperName.endsWith('ES') || upperName.endsWith(' ESP')) return 'es';

    // Check for French patterns - "Fr", "FR" suffix
    if (/_fr$/i.test(channelName) || / fr$/i.test(channelName) || /\bfre\b/i.test(channelName) ||
        /\bfrance\b/i.test(channelName) || /\bfrançais\b/i.test(title) ||
        /Fr$/.test(channelName) || /\sFr$/.test(channelName) ||
        upperName.endsWith(' FR') || upperName.endsWith('FR')) return 'fr';

    // Check for German patterns - "DE", "De" suffix
    if (/_de$/i.test(channelName) || / de$/i.test(channelName) || /\bdeutsch\b/i.test(channelName) ||
        /De$/.test(channelName) || /\sDe$/.test(channelName) ||
        upperName.endsWith(' DE') || upperName.endsWith('DE')) return 'de';

    // Check for Portuguese/Brazilian patterns - "PT", "Pt", "BR" suffix
    if (/_pt$/i.test(channelName) || /_br$/i.test(channelName) ||
        /\bbrasil\b/i.test(channelName) || /\bportuguês\b/i.test(title) ||
        /Pt$/.test(channelName) || /\sPt$/.test(channelName) ||
        upperName.endsWith(' PT') || upperName.endsWith('PT') ||
        upperName.endsWith(' BR') || upperName.endsWith('BR')) return 'pt';

    // Check for English patterns - "US", "UK", "EN" suffix
    if (/_en$/i.test(channelName) || /_us$/i.test(channelName) || /_uk$/i.test(channelName) ||
        / en$/i.test(channelName) || / us$/i.test(channelName) || / uk$/i.test(channelName) ||
        /\benglish\b/i.test(title)) return 'en';

    // Check for Russian patterns - "RU", "Ru" suffix
    if (/_ru$/i.test(channelName) || / ru$/i.test(channelName) || /\brussia\b/i.test(channelName) ||
        /Ru$/.test(channelName) || /\sRu$/.test(channelName) ||
        upperName.endsWith(' RU') || upperName.endsWith('RU')) return 'ru';

    // Check for Polish patterns - "POL", "Pl" suffix
    if (/_pol$/i.test(channelName) || /_pl$/i.test(channelName) ||
        /\bpoland\b/i.test(channelName) || /\bpolski\b/i.test(title) ||
        /Pol$/.test(channelName) || /\sPol$/.test(channelName) ||
        upperName.endsWith(' POL') || upperName.endsWith('POL') ||
        upperName.endsWith(' PL') || upperName.endsWith('PL')) return 'pl';

    // Check for Turkish patterns - "TR", "Tr" suffix
    if (/_tr$/i.test(channelName) || / tr$/i.test(channelName) || /\bturkey\b/i.test(channelName) ||
        /Tr$/.test(channelName) || /\sTr$/.test(channelName) ||
        upperName.endsWith(' TR') || upperName.endsWith('TR')) return 'tr';

    // Check for Japanese patterns - "JP" suffix
    if (/_jp$/i.test(channelName) || / jp$/i.test(channelName) || /\bjapan\b/i.test(channelName) ||
        upperName.endsWith(' JP') || upperName.endsWith('JP')) return 'ja';

    // Check for Korean patterns - "KR" suffix
    if (/_kr$/i.test(channelName) || / kr$/i.test(channelName) || /\bkorea\b/i.test(channelName) ||
        upperName.endsWith(' KR') || upperName.endsWith('KR')) return 'ko';

    // Check for Chinese patterns - "CN" suffix
    if (/_cn$/i.test(channelName) || / cn$/i.test(channelName) || /\bchina\b/i.test(channelName) ||
        upperName.endsWith(' CN') || upperName.endsWith('CN')) return 'zh';

    return 'unknown';
};
