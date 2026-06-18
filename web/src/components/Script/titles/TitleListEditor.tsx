import React from 'react';
import { SuggestedTitles } from './SuggestedTitles';
import { TitleCategoriesModal } from '../modals/TitleCategoriesModal';

export interface TitleListHistoryItem {
    id: string;
    title: string;
    link: string;
    lastUsedAt: number;
    uses: number;
}

interface TitleListEditorProps {
    titles: string[];
    onTitlesChange: (titles: string[]) => void;
    onOpenHistory: () => void;
}

export const TitleListEditor: React.FC<TitleListEditorProps> = ({
    titles,
    onTitlesChange,
    onOpenHistory,
}) => {
    const extractProtagonist = (source: string): string => {
        const cleaned = (source || '').trim();
        if (!cleaned) return '';
        const head = cleaned.split(/[|:\-–—]/)[0].trim();
        const tokenMatch = head.match(/[A-Za-z0-9'’._-]+(?:\s+[A-Za-z0-9'’._-]+){0,2}/);
        return (tokenMatch?.[0] || '').trim();
    };

    const replaceCategoryPlaceholders = (incoming: string[]): string[] => {
        const firstExisting = titles.find((t) => t.trim()) || '';
        const firstIncoming = incoming.find((t) => t.trim()) || '';
        const protagonist = extractProtagonist(firstExisting || firstIncoming);
        if (!protagonist) return incoming;

        return incoming.map((t) => {
            const raw = String(t || '');
            return raw
                .replace(/\{[xX]\}/g, protagonist)
                .replace(/\{[yY]\}/g, protagonist)
                .replace(/\b[xX]\b/g, protagonist)
                .replace(/\b[yY]\b/g, protagonist);
        });
    };

    const handleTitleChange = (index: number, value: string) => {
        const newTitles = [...titles];
        newTitles[index] = value;

        // Auto-extend logic: if user types in the last title, add a new empty one
        if (index === titles.length - 1 && value.trim() !== '') {
            newTitles.push('');
        }

        onTitlesChange(newTitles);
    };

    const removeTitle = (index: number) => {
        if (titles.length > 1) {
            onTitlesChange(titles.filter((_, i) => i !== index));
        } else {
            onTitlesChange(['']);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="relative">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <span className="material-symbols-outlined text-amber-500 text-xl">stylus_note</span>
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-100 tracking-tight">Crea i tuoi Titoli</h4>
                            <p className="text-[12px] text-slate-500 font-medium">Scrivi un titolo e ne apparirà un altro automaticamente</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TitleCategoriesModal
                            onSelectTitles={(newTitles) => {
                                const normalizedTitles = replaceCategoryPlaceholders(newTitles);
                                // Merge with existing or replace
                                if (titles.length === 1 && titles[0] === '') {
                                    onTitlesChange(normalizedTitles);
                                } else {
                                    onTitlesChange([...titles.filter(t => t.trim() !== ''), ...normalizedTitles, '']);
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={onOpenHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/20"
                        >
                            <span className="material-symbols-outlined text-lg">history</span>
                            Storico
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {titles.map((title, index) => (
                        <div key={index} className="group relative bg-slate-950/40 border border-white/5 rounded-xl p-3 hover:border-amber-500/20 hover:bg-slate-900/60 transition-all duration-300 ring-1 ring-white/5">
                            <div className="flex items-center gap-3">
                                <div className="text-[9px] font-black text-slate-700 w-4 h-4 flex items-center justify-center rounded-full bg-white/5 shrink-0">
                                    {index + 1}
                                </div>
                                <textarea
                                    value={title}
                                    onChange={(e) => handleTitleChange(index, e.target.value)}
                                    placeholder={index === titles.length - 1 ? "Aggiungi un titolo..." : "Scrivi titolo..."}
                                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-200 text-xs font-semibold placeholder:text-slate-700 resize-none min-h-[24px] py-0.5 leading-tight"
                                    rows={1}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${target.scrollHeight}px`;
                                    }}
                                />
                                {title.trim() !== '' && (
                                    <button
                                        onClick={() => removeTitle(index)}
                                        className="p-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-base">close</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <SuggestedTitles
                        currentTitle={titles[0] || ''}
                        onSelect={(title) => {
                            const newTitles = [...titles];
                            // Replace the first empty or the first slot
                            if (newTitles[0] === '') {
                                newTitles[0] = title;
                            } else {
                                newTitles.unshift(title);
                            }
                            // Trigger auto-extension if needed
                            if (newTitles[newTitles.length - 1] !== '') {
                                newTitles.push('');
                            }
                            onTitlesChange(newTitles);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
