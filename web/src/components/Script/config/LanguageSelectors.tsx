import React from 'react';

interface LanguageSelectorsProps {
    voiceoverLangs: string[];
    onVoiceoverLangsChange: (langs: string[]) => void;
}

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

export const LanguageSelectors: React.FC<LanguageSelectorsProps> = ({
    voiceoverLangs,
    onVoiceoverLangsChange
}) => {
    const isAllSelected = voiceoverLangs.length === VOICEOVER_OPTIONS.length;

    const toggleAll = () => {
        if (isAllSelected) {
            onVoiceoverLangsChange(['it-IT']);
        } else {
            onVoiceoverLangsChange(VOICEOVER_OPTIONS.map(opt => opt.code));
        }
    };

    const toggleLang = (code: string) => {
        if (voiceoverLangs.includes(code)) {
            if (voiceoverLangs.length > 1) {
                onVoiceoverLangsChange(voiceoverLangs.filter(l => l !== code));
            }
        } else {
            onVoiceoverLangsChange([...voiceoverLangs, code]);
        }
    };

    return (
        <div className="p-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-sm">
            {/* Lingue Voiceover */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/5">
                            <span className="material-symbols-outlined text-purple-400 text-xl">record_voice_over</span>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-100 tracking-tight">Lingue Voiceover</label>
                            <p className="text-[11px] text-slate-500">Seleziona i mercati di destinazione</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleAll}
                        className={`text-[10px] font-black px-4 py-1.5 rounded-xl transition-all border tracking-widest ${isAllSelected
                            ? 'bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20'
                            : 'bg-slate-800/40 text-slate-400 border-white/10 hover:border-white/20'
                            }`}
                    >
                        {isAllSelected ? 'DESELEZIONA TUTTO' : 'SELEZIONA TUTTE'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-3">
                    {VOICEOVER_OPTIONS.map(opt => (
                        <button
                            key={opt.code}
                            onClick={() => toggleLang(opt.code)}
                            title={opt.label}
                            className={`flex items-center justify-center w-10 h-10 rounded-[14px] border transition-all duration-300 ${voiceoverLangs.includes(opt.code)
                                ? 'bg-purple-600/20 border-purple-500 text-xl shadow-lg shadow-purple-500/10'
                                : 'bg-slate-950/60 border-white/5 text-xl grayscale opacity-30 hover:grayscale-0 hover:opacity-100 hover:border-white/10'
                                }`}
                        >
                            {opt.flag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
