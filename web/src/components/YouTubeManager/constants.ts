// Constants for YouTube Channels App

// Language options
export const LANGUAGES = [
    { code: 'it', name: 'Italiano', emoji: '🇮🇹' },
    { code: 'es', name: 'Español', emoji: '🇪🇸' },
    { code: 'fr', name: 'Français', emoji: '🇫🇷' },
    { code: 'de', name: 'Deutsch', emoji: '🇩🇪' },
    { code: 'pt', name: 'Português', emoji: '🇧🇷' },
    { code: 'en', name: 'English', emoji: '🇺🇸' },
    { code: 'ru', name: 'Русский', emoji: '🇷🇺' },
    { code: 'pl', name: 'Polski', emoji: '🇵🇱' },
    { code: 'tr', name: 'Türkçe', emoji: '🇹🇷' },
    { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
    { code: 'id', name: 'Indonesian', emoji: '🇮🇩' },
    { code: 'ja', name: '日本語', emoji: '🇯🇵' },
    { code: 'ko', name: '한국어', emoji: '🇰🇷' },
    { code: 'zh', name: '中文', emoji: '🇨🇳' },
    { code: 'unknown', name: 'Unknown', emoji: '🌐' },
];

// Group colors
export const groupColors: Record<string, string> = {
    'Boxe': 'bg-blue-500',
    'Crime': 'bg-red-500',
    'Discovery': 'bg-orange-500',
    'Music': 'bg-pink-500',
    'Pop': 'bg-purple-500',
    'Wwe': 'bg-gray-500',
    'Finance': 'bg-emerald-500',
    'Tech': 'bg-indigo-500',
    'Gaming': 'bg-amber-500',
    'Crypto': 'bg-orange-500',
    'News': 'bg-red-500',
    'Education': 'bg-violet-500',
    'Fitness': 'bg-teal-500',
    'Entertainment': 'bg-rose-500',
    'Default': 'bg-gray-500',
    'Undefined': 'bg-gray-400',
};

// Get language emoji
export const getLanguageEmoji = (language: string): string => {
    const lang = LANGUAGES.find(l => l.code === language);
    return lang?.emoji || '🌐';
};

// Get language name
export const getLanguageName = (language: string): string => {
    const lang = LANGUAGES.find(l => l.code === language);
    return lang?.name || 'Unknown';
};

// Capitalize first letter of each word
export const capitalizeName = (name: string): string => {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};


