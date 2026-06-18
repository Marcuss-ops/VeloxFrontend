import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SuggestedTitlesProps {
    currentTitle: string;
    onSelect: (title: string) => void;
}

interface WindowWithApiBase extends Window {
    API_BASE_URL?: string;
}

export const SuggestedTitles: React.FC<SuggestedTitlesProps> = ({ currentTitle, onSelect }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const hasGeneratedRef = useRef(false);

    const handleGenerate = useCallback(async () => {
        if (!currentTitle.trim()) return;

        setIsGenerating(true);
        setError(null);
        try {
            const apiBase = (window as WindowWithApiBase).API_BASE_URL || '';
            const response = await fetch(`${apiBase}/api/titles/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: currentTitle })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content || '[]';

            content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    setSuggestions(parsed.filter(t => t.length > 5));
                }
            } catch (e) {
                console.error('Parsing error:', e, content);
                setError('Errore nella risposta dell\'AI');
            }
        } catch (err: unknown) {
            console.error('NVIDIA API Error:', err);
            setError('Impossibile connettersi all\'AI');
        } finally {
            setIsGenerating(false);
        }
    }, [currentTitle]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (currentTitle.trim() && currentTitle.length >= 5 && !hasGeneratedRef.current) {
            debounceRef.current = setTimeout(() => {
                hasGeneratedRef.current = true;
                handleGenerate();
            }, 1500);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [currentTitle, handleGenerate]);

    useEffect(() => {
        if (currentTitle.length < 5) {
            hasGeneratedRef.current = false;
            setSuggestions([]);
        }
    }, [currentTitle]);

    return (
        <div className="mt-4 p-4 bg-slate-950/40 rounded-2xl border border-white/5 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">auto_awesome</span>
                    <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Titoli Suggeriti</h4>
                    {isGenerating && (
                        <span className="text-[10px] text-amber-400 animate-pulse ml-2">Genero...</span>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 text-center">
                    {error}
                </div>
            )}

            {!currentTitle.trim() ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <span className="material-symbols-outlined text-slate-700 text-3xl mb-2">lightbulb</span>
                    <p className="text-[10px] text-slate-500 max-w-[200px]">Inserisci un titolo per ottenere suggerimenti automatici</p>
                </div>
            ) : suggestions.length === 0 && !isGenerating ? (
                <div className="flex flex-col items-center justify-center py-6 text-center opacity-40">
                    <span className="material-symbols-outlined text-slate-600 text-2xl mb-1">psychology</span>
                    <p className="text-[9px] text-slate-500">Sto analizzando il tuo titolo...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                    {suggestions.map((title, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(title)}
                            className="text-left p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 hover:bg-slate-800 transition-all group relative overflow-hidden"
                        >
                            <div className="text-xs text-slate-400 group-hover:text-slate-100 line-clamp-2 leading-relaxed z-10 relative">
                                {title}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
