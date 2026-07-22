import React from 'react';
import { VideoProject, VideoStyle, DEFAULT_PROJECT } from '../types';
import { ProjectQueue } from '../ProjectQueue';
import { StyleGroupSelector } from '../config/StyleGroupSelector';
import { ActionBar } from '../ActionBar';

export interface ScriptToolbarProps {
    // State
    projects: VideoProject[];
    currentIndex: number;
    isGenerating: boolean;
    progress: number;
    // Actions
    onProjectSelect: (index: number) => void;
    onAddProject: () => void;
    onDestinationChange: (destinationId: string) => void;
    onStyleChange: (style: VideoStyle) => void;
    onHistoryClick: () => void;
    onExecute: () => void;
}

// Voiceover language options
const VOICEOVER_OPTIONS = [
    { code: 'it-IT', flag: '🇮🇹', label: 'Italiano' },
    { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
    { code: 'pt-BR', flag: '🇧🇷', label: 'Português' },
    { code: 'en-US', flag: '🇺🇸', label: 'English' },
    { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
    { code: 'ru-RU', flag: '🇷🇺', label: 'Русский' },
    { code: 'tr-TR', flag: '🇹🇷', label: 'Türkçe' },
    { code: 'id-ID', flag: '🇮🇩', label: 'Bahasa' },
    { code: 'pl-PL', flag: '🇵🇱', label: 'Polski' },
    { code: 'de-DE', flag: '🇩🇪', label: 'Deutsch' },
];

// Common English words that strongly indicate English language
const ENGLISH_INDICATORS = [
    /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall)\b/i,
    /\b(this|that|these|those|here|there|where|when|why|how|what|which|who|whom|whose)\b/i,
    /\b(and|but|or|nor|for|yet|so|although|because|since|unless|while|whereas)\b/i,
    /\b(new|old|good|bad|best|worst|great|little|big|small|large|long|short|high|low)\b/i,
    /\b(footage|video|videos|viral|goes|went|killed|killing|murder|death|life|live|living)\b/i,
    /\b(see|saw|seen|watch|watched|watching|look|looked|looking|show|showed|shown|showing)\b/i,
    /\b(get|got|gotten|getting|make|made|making|take|took|taken|taking|give|gave|given|giving)\b/i,
    /\b(people|person|man|woman|child|children|world|year|years|time|day|days|way|ways)\b/i,
];

// Language detection patterns for titles
const TITLE_LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
    'it-IT': [
        /\b(il|la|lo|gli|le|un|una|uno|di|da|in|con|per|che|è|sono|ha|hanno|questo|quello|molto|più|meglio|nuovo|nuova)\b/i,
        /\b(migliore|migliori|canzoni|musica|trailer|film|movie|parte|episodio|italiano|italia)\b/i,
        /\b(è|perché|così|quindi|anche|ancora|già|solo|tutto|tutti|tutte|ogni|qualche)\b/i,
    ],
    'es-ES': [
        /\b(los|las|un|una|del|al|por|para|que|es|son|tiene|este|ese|muy|más|mejor)\b/i,
        /\b(mejor|mejores|vídeo|canciones|música|película|parte|episodio|español|españa)\b/i,
        /\b(también|porque|así|entonces|aunque|todavía|ya|solo|todo|todos|todas|cada|algún)\b/i,
    ],
    'pt-BR': [
        /\b(os|as|um|uma|dos|das|em|com|por|para|que|é|são|tem|este|esse|muito|mais|melhor)\b/i,
        /\b(melhor|melhores|vídeo|canções|música|filme|parte|episódio|português|brasil)\b/i,
        /\b(também|porque|assim|então|embora|ainda|já|só|tudo|todos|todas|cada|algum)\b/i,
    ],
    'fr-FR': [
        /\b(les|des|un|une|du|au|en|avec|pour|qui|est|sont|ce|cette|très|plus|meilleur)\b/i,
        /\b(meilleur|meilleurs|vidéo|chansons|musique|film|partie|épisode|français|france)\b/i,
        /\b(aussi|parce|comme|alors|encore|déjà|seulement|tout|tous|toutes|chaque|quelque)\b/i,
    ],
    'ru-RU': [
        /[\u0400-\u04FF]+/,  // Cyrillic characters
    ],
    'tr-TR': [
        /\b(ve|bir|bu|şu|için|ile|olan|en|daha|iyi|video|müzik|film|bölüm|türkçe|türkiye)\b/i,
        /[ğşıİçöü]/,  // Turkish special chars
    ],
    'id-ID': [
        /\b(dan|yang|ini|itu|untuk|dari|dengan|adalah|yang|paling|terbaik|video|musik|film|bagian|indonesia)\b/i,
    ],
    'pl-PL': [
        /\b(i|w|na|do|z|że|jest|są|ten|to|bardzo|więcej|najlepszy|video|muzyka|film|część|polski|polska)\b/i,
        /[ąćęłńóśźż]/,  // Polish special chars
    ],
    'de-DE': [
        /\b(der|die|das|ein|eine|von|in|mit|für|ist|sind|dieser|diese|sehr|mehr|beste|video|musik|film|teil|deutsch|deutschland)\b/i,
        /[äöüß]/,  // German special chars
    ],
};

/**
 * Detect language from a title string.
 * Returns 'en-US' if no specific language is detected (English is default).
 * Returns the detected language code otherwise.
 */
export const detectLanguageFromTitle = (title: string): string => {
    const text = (title || '').trim().toLowerCase();
    
    if (!text) return 'en-US';
    
    // First, check for English indicators
    let englishScore = 0;
    for (const pattern of ENGLISH_INDICATORS) {
        const matches = text.match(pattern);
        if (matches) englishScore += matches.length;
    }
    
    // Check for special characters
    const specialCharCount = (text.match(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĳĵķĺļľŀłńņňŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżžşğıİçöüăđħĸłńŧșțΐάέήίόύώа-яёіїєґ]/gi) || []).length;
    
    // Check for Cyrillic (Russian)
    const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
    if (cyrillicCount >= 3) {
        return 'ru-RU';
    }
    
    // If strong English indicators and no special chars, return English
    if (englishScore >= 2 && specialCharCount < 2) {
        return 'en-US';
    }
    
    // Check each language's patterns
    let bestMatch: { lang: string; score: number } = { lang: 'en-US', score: 0 };
    
    for (const [langCode, patterns] of Object.entries(TITLE_LANGUAGE_PATTERNS)) {
        if (langCode === 'ru-RU') continue;
        
        const langSpecificPattern = patterns[patterns.length - 1];
        const hasSpecialChars = langSpecificPattern.test(text);
        
        let totalMatches = 0;
        for (const p of patterns) {
            const m = text.match(p);
            if (m) totalMatches += m.length;
        }
        
        const threshold = hasSpecialChars ? 2 : 3;
        
        if (totalMatches >= threshold && totalMatches > bestMatch.score) {
            bestMatch = { lang: langCode, score: totalMatches };
        }
    }
    
    if (englishScore >= 3 && bestMatch.score < 4) {
        return 'en-US';
    }
    
    return bestMatch.lang;
};

// Auto-detect language from title and update voiceoverLangs
export const useAutoLanguageDetection = (
    titles: string[],
    currentLangs: string[],
    onLangsChange: (langs: string[]) => void
) => {
    const prevTitlesRef = React.useRef<string>('');

    React.useEffect(() => {
        const firstTitle = (titles || [''])[0] || '';
        const trimmedTitle = firstTitle.trim();
        
        if (!trimmedTitle || prevTitlesRef.current === trimmedTitle) {
            return;
        }
        
        prevTitlesRef.current = trimmedTitle;
        
        const detectedLang = detectLanguageFromTitle(trimmedTitle);
        const isEnglish = detectedLang === 'en-US';
        
        console.log('[AUTO-LANG] Title:', trimmedTitle.substring(0, 50) + '...');
        console.log('[AUTO-LANG] Detected:', detectedLang, '| Is English:', isEnglish);
        
        const allLangCodes = VOICEOVER_OPTIONS.map(opt => opt.code);
        
        if (isEnglish) {
            if (currentLangs.length !== allLangCodes.length) {
                console.log('[AUTO-LANG] English detected → Selecting ALL languages');
                onLangsChange(allLangCodes);
            }
        } else {
            if (!currentLangs.includes(detectedLang) || currentLangs.length > 1) {
                console.log('[AUTO-LANG] Non-English detected → Selecting ONLY:', detectedLang);
                onLangsChange([detectedLang]);
            }
        }
    }, [titles, currentLangs, onLangsChange]);
};

export const ScriptToolbar: React.FC<ScriptToolbarProps> = ({
    projects,
    currentIndex,
    isGenerating,
    progress,
    onProjectSelect,
    onAddProject,
    onDestinationChange,
    onStyleChange,
    onHistoryClick,
    onExecute,
}) => {
    const project = projects[currentIndex] || DEFAULT_PROJECT;

    return (
        <div className="z-20">
            <ProjectQueue
                projects={projects}
                currentIndex={currentIndex}
                onProjectSelect={onProjectSelect}
                onAddProject={onAddProject}
            />

            {/* SCRIPT GENERATOR - PREMIUM GLASS */}
            <div className="rounded-2xl overflow-visible border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">
                <div className="relative">
                    <StyleGroupSelector
                        selectedDestinationId={project.externalDestinationId}
                        selectedStyle={project.videoStyle}
                        onDestinationChange={onDestinationChange}
                        onStyleChange={onStyleChange}
                        onHistoryClick={onHistoryClick}
                    />
                </div>
            </div>

            <ActionBar
                isGenerating={isGenerating}
                progress={progress}
                onExecute={onExecute}
            />
        </div>
    );
};

export default ScriptToolbar;
