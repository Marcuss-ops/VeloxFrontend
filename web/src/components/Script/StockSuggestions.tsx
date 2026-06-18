import React, { useState, useEffect, useCallback } from 'react';

interface StockSuggestion {
    id: string;
    name: string;
    fileCount: number;
    pathMatch: string; // quale parte del titolo ha matchato
}

interface StockSuggestionsProps {
    title: string;
    stockMainFolderId: string | null;
    onSelectFolder: (folder: { id: string; name: string }) => void;
}

// Patterns comuni per estrarre protagonisti dai titoli
const PROTAGONIST_PATTERNS = [
    // Pattern: "X times [Name] [verb]" es. "10 times The Rock cheated"
    /(\d+\s+times\s+)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    // Pattern: "[Name] [verb]" es. "The Rock vs John Cena"
    /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:vs|versus|and|&)/i,
    // Pattern: "[verb] [Name]" es. "Watch The Rock destroy"
    /(?:watch|see|meet|vs)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    // Pattern: "[Name]'s" es. "The Rock's best moments"
    /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)'s/i,
    // Pattern: "Best of [Name]" 
    /best\s+(?:of\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    // Pattern: "[Name] greatest" 
    /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:greatest|best|top|epic)/i,
];

// Nomi comuni da filtrare (non sono protagonisti)
const COMMON_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
    'these', 'those', 'here', 'there', 'where', 'when', 'why', 'how',
    'what', 'which', 'who', 'whom', 'whose', 'and', 'but', 'or', 'nor',
    'for', 'yet', 'so', 'new', 'old', 'good', 'bad', 'best', 'worst',
    'great', 'little', 'big', 'small', 'large', 'long', 'short', 'high',
    'low', 'video', 'videos', 'viral', 'footage', 'times', 'watch',
    'moments', 'compilation', 'ever', 'top', 'epic', 'insane', 'crazy',
]);

/**
 * Estrae possibili nomi di protagonisti dal titolo
 */
const extractProtagonists = (title: string): string[] => {
    const text = (title || '').trim();
    if (!text) return [];
    
    const candidates: string[] = [];
    
    // Prova ogni pattern
    for (const pattern of PROTAGONIST_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[2]) {
            candidates.push(match[2].trim());
        } else if (match && match[1]) {
            candidates.push(match[1].trim());
        }
    }
    
    // Estrai parole con maiuscola (possibili nomi propri)
    const capitalWords = text.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
    
    // Combina parole consecutive con maiuscola
    let currentName = '';
    for (let i = 0; i < capitalWords.length; i++) {
        const word = capitalWords[i];
        // Salta parole comuni
        if (COMMON_WORDS.has(word.toLowerCase())) {
            if (currentName) {
                candidates.push(currentName.trim());
                currentName = '';
            }
            continue;
        }
        
        // Aggiungi alla sequenza
        if (currentName) {
            currentName += ' ' + word;
        } else {
            currentName = word;
        }
    }
    if (currentName) {
        candidates.push(currentName.trim());
    }
    
    // Rimuovi duplicati e filtra
    const unique = [...new Set(candidates)]
        .filter(name => {
            const lower = name.toLowerCase();
            // Filtra nomi troppo corti o troppo lunghi
            if (name.length < 3 || name.length > 30) return false;
            // Filtra parole comuni
            if (COMMON_WORDS.has(lower)) return false;
            // Filtra solo numeri
            if (/^\d+$/.test(name)) return false;
            return true;
        })
        .sort((a, b) => b.length - a.length); // Preferisci nomi più lunghi
    
    return unique.slice(0, 3); // Max 3 candidati
};

export const StockSuggestions: React.FC<StockSuggestionsProps> = ({
    title,
    stockMainFolderId,
    onSelectFolder,
}) => {
    const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSearchedTitle, setLastSearchedTitle] = useState<string>('');
    
    const searchStockFolders = useCallback(async (searchTerms: string[], mainFolderId: string | null) => {
        if (!mainFolderId || searchTerms.length === 0) {
            setSuggestions([]);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const apiBase = (window as any).API_BASE_URL || '';
            const results: StockSuggestion[] = [];
            
            // Prima ottieni tutte le sottocartelle della cartella stock principale
            const foldersRes = await fetch(`${apiBase}/api/drive/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: mainFolderId }),
            });
            
            if (!foldersRes.ok) {
                throw new Error('Errore caricamento cartelle stock');
            }
            
            const foldersData = await foldersRes.json();
            const folders = (foldersData.folders || foldersData.files || [])
                .filter((f: any) => f.type === 'folder' || f.mimeType === 'application/vnd.google-apps.folder');
            
            // Cerca match tra i termini e le cartelle
            for (const term of searchTerms) {
                const termLower = term.toLowerCase();
                
                for (const folder of folders) {
                    const folderName = (folder.name || '').toLowerCase();
                    
                    // Check se il nome della cartella inizia con o contiene il termine
                    if (folderName.startsWith(termLower) || 
                        folderName.includes(termLower) ||
                        termLower.includes(folderName)) {
                        
                        // Conta i file nella cartella
                        let fileCount = 0;
                        try {
                            const filesRes = await fetch(`${apiBase}/api/drive/files`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ parent_id: folder.id }),
                            });
                            if (filesRes.ok) {
                                const filesData = await filesRes.json();
                                fileCount = (filesData.files || []).filter(
                                    (f: any) => f.type !== 'folder' && f.mimeType !== 'application/vnd.google-apps.folder'
                                ).length;
                            }
                        } catch {
                            // Ignora errori nel conteggio
                        }
                        
                        results.push({
                            id: folder.id,
                            name: folder.name,
                            fileCount,
                            pathMatch: term,
                        });
                    }
                }
            }
            
            // Rimuovi duplicati e ordina per numero di file
            const uniqueResults = results
                .filter((r, idx, arr) => arr.findIndex(x => x.id === r.id) === idx)
                .sort((a, b) => b.fileCount - a.fileCount);
            
            setSuggestions(uniqueResults.slice(0, 5));
            
        } catch (err: any) {
            console.error('[StockSuggestions] Search error:', err);
            setError(err.message || 'Errore nella ricerca');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Esegui ricerca quando il titolo cambia
    useEffect(() => {
        const trimmedTitle = (title || '').trim();
        
        // Evita ricerche duplicate
        if (trimmedTitle === lastSearchedTitle) return;
        if (trimmedTitle.length < 5) {
            setSuggestions([]);
            return;
        }
        
        setLastSearchedTitle(trimmedTitle);
        
        // Estrai protagonisti
        const protagonists = extractProtagonists(trimmedTitle);
        
        if (protagonists.length === 0) {
            setSuggestions([]);
            return;
        }
        
        console.log('[StockSuggestions] Extracted protagonists:', protagonists);
        
        // Cerca cartelle correlate
        if (stockMainFolderId) {
            searchStockFolders(protagonists, stockMainFolderId);
        }
    }, [title, stockMainFolderId, lastSearchedTitle, searchStockFolders]);
    
    // Non mostrare nulla se non ci sono suggerimenti
    if (!stockMainFolderId || (suggestions.length === 0 && !loading)) {
        return null;
    }
    
    return (
        <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-emerald-400 text-lg">
                    auto_awesome
                </span>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Stock Suggerito
                </span>
                {loading && (
                    <span className="material-symbols-outlined text-emerald-400 text-sm animate-spin ml-2">
                        progress_activity
                    </span>
                )}
            </div>
            
            {error && (
                <div className="text-xs text-red-400 mb-2">{error}</div>
            )}
            
            {!loading && suggestions.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 mb-2">
                        Cartelle trovate in base al titolo:
                    </p>
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion.id}
                            className="flex items-center justify-between p-3 bg-slate-900/50 border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-500 text-lg">
                                    folder
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-slate-200">
                                        {suggestion.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        Match: "<span className="text-emerald-400">{suggestion.pathMatch}</span>" • {suggestion.fileCount} elementi
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => onSelectFolder({ id: suggestion.id, name: suggestion.name })}
                                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                            >
                                <span className="material-symbols-outlined text-sm align-middle mr-1">add</span>
                                Aggiungi
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {!loading && suggestions.length === 0 && (
                <p className="text-[10px] text-slate-500 italic">
                    Nessuna cartella stock trovata per questo titolo
                </p>
            )}
        </div>
    );
};

export default StockSuggestions;