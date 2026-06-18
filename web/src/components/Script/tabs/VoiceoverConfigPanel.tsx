import React from 'react';

interface VoiceoverConfigPanelProps {
    selectedLanguages: string[];
    toggleLanguage: (code: string) => void;
    selectAllLanguages: () => void;
}

export const LANGUAGES = [
    { code: 'it-IT', flag: '🇮🇹', label: 'Italiano' },
    { code: 'es-ES', flag: '🇪🇸', label: 'Español' },
    { code: 'pt-BR', flag: '🇧🇷', label: 'Português' },
    { code: 'en-US', flag: '🇺🇸', label: 'English' },
    { code: 'fr-FR', flag: '🇫🇷', label: 'Français' },
    { code: 'ru-RU', flag: '🇷🇺', label: 'Русский' },
    { code: 'tr-TR', flag: '🇹🇷', label: 'Türkçe' },
    { code: 'de-DE', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'pl-PL', flag: '🇵🇱', label: 'Polski' },
    { code: 'id-ID', flag: '🇮🇩', label: 'Bahasa' },
];

export const VoiceoverConfigPanel: React.FC<VoiceoverConfigPanelProps> = ({
    selectedLanguages,
    toggleLanguage,
    selectAllLanguages,
}) => {
    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                        <span className="material-symbols-outlined text-sky-400 text-xl">translate</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Lingue</h3>
                        <p className="text-xs text-slate-500">Seleziona le lingue per il voiceover</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={selectAllLanguages}
                    className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all"
                >
                    Seleziona Tutte
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {LANGUAGES.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => toggleLanguage(lang.code)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                            selectedLanguages.includes(lang.code)
                                ? 'bg-sky-500/20 border-sky-500/50 shadow-lg shadow-sky-500/10'
                                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                    >
                        <span className="text-xl">{lang.flag}</span>
                        <span className={`text-[10px] font-bold ${
                            selectedLanguages.includes(lang.code) ? 'text-sky-300' : 'text-slate-500'
                        }`}>
                            {lang.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
