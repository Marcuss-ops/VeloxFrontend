import React, { useState, useEffect, useCallback } from 'react';
import { 
    Categories, 
    loadCategories, 
    getTitlesFromCategory 
} from '../data/titleCategoriesData';

interface TitleSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectTitle: (title: string) => void;
    currentTitle?: string;
}

// Title item with hover add button
const TitleItem = React.memo<{
    title: string;
    category?: string;
    isSelected: boolean;
    onAdd: (title: string) => void;
    showCategory?: boolean;
    index?: number;
}>(({ title, category, isSelected, onAdd, showCategory = false, index }) => {
    const [showAddBtn, setShowAddBtn] = useState(false);
    const hoverTimeout = React.useRef<number | null>(null);

    const handleMouseEnter = () => {
        hoverTimeout.current = window.setTimeout(() => {
            setShowAddBtn(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) {
            window.clearTimeout(hoverTimeout.current);
        }
        setShowAddBtn(false);
    };

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAdd(title);
    };

    return (
        <div 
            className={`relative p-3 rounded-xl border transition-all group cursor-pointer ${
                isSelected 
                    ? 'bg-amber-500/30 border-amber-500/50' 
                    : 'border-white/10 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30'
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex items-start gap-3">
                {index !== undefined && (
                    <div className="text-[9px] font-black text-white/30 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 shrink-0 mt-0.5">
                        {index}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium leading-relaxed ${
                        isSelected ? 'text-amber-200' : 'text-white group-hover:text-amber-200'
                    }`}>
                        {title}
                    </div>
                    {showCategory && category && (
                        <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">folder</span>
                            {category}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add button - appears after 0.5s hover */}
            {showAddBtn && !isSelected && (
                <button
                    onClick={handleAdd}
                    className="absolute top-2 right-2 w-7 h-7 bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all z-10"
                    title="Aggiungi titolo"
                >
                    <span className="material-symbols-outlined text-white text-sm">add</span>
                </button>
            )}
            
            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs">check</span>
                </div>
            )}
        </div>
    );
});

TitleItem.displayName = 'TitleItem';

export const TitleSelectionModal: React.FC<TitleSelectionModalProps> = ({ 
    open, 
    onOpenChange, 
    onSelectTitle,
    currentTitle = ''
}) => {
    const [categories, setCategories] = useState<Categories>({});
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

    // Parse current title to pre-select existing titles
    useEffect(() => {
        if (open && currentTitle) {
            const titles = currentTitle.split(',').map(t => t.trim()).filter(Boolean);
            setSelectedTitles(new Set(titles));
        } else if (open) {
            setSelectedTitles(new Set());
        }
    }, [open, currentTitle]);

    useEffect(() => {
        if (open) {
            setCategories(loadCategories());
            setSearchQuery('');
            setSelectedCategory(null);
        }
    }, [open]);

    const getAllTitles = useCallback((): { category: string; title: string }[] => {
        const allTitles: { category: string; title: string }[] = [];
        for (const [catName, data] of Object.entries(categories)) {
            const titles = getTitlesFromCategory(data);
            for (const title of titles) {
                allTitles.push({ category: catName, title });
            }
        }
        return allTitles;
    }, [categories]);

    const filteredTitles = searchQuery.trim()
        ? getAllTitles().filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    const addTitle = useCallback((title: string) => {
        // Add to local selected set
        setSelectedTitles(prev => {
            const newSet = new Set(prev);
            if (!newSet.has(title)) {
                newSet.add(title);
            }
            return newSet;
        });
        
        // Notify parent - but DON'T close modal
        onSelectTitle(title);
    }, [onSelectTitle]);

    const removeTitle = useCallback((title: string) => {
        setSelectedTitles(prev => {
            const newSet = new Set(prev);
            newSet.delete(title);
            return newSet;
        });
    }, []);

    const handleClearAll = () => {
        setSelectedTitles(new Set());
    };

    if (!open) return null;

    const selectedCount = selectedTitles.size;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            
            {/* Modal */}
            <div 
                className="relative z-10 w-[90vw] max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
                style={{
                    background: 'rgba(15, 12, 25, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(139, 92, 246, 0.20)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)',
                }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />
                        <div>
                            <h1 className="text-base font-bold text-white">Seleziona Titoli</h1>
                            <p className="text-[10px] text-white/40">Hover su un titolo per vedere il pulsante +</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                {/* Selected Titles Bar */}
                {selectedCount > 0 && (
                    <div className="px-5 py-3 border-b border-white/10 bg-purple-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-purple-300">
                                {selectedCount} titolo{selectedCount > 1 ? 'i' : ''} selezionato{selectedCount > 1 ? 'i' : ''}
                            </span>
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] text-white/50 hover:text-white transition-colors"
                            >
                                Cancella tutto
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                            {Array.from(selectedTitles).map((title) => (
                                <div 
                                    key={title}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/30 border border-purple-500/50"
                                >
                                    <span className="text-[11px] text-white max-w-[200px] truncate">{title}</span>
                                    <button
                                        onClick={() => removeTitle(title)}
                                        className="text-white/50 hover:text-white ml-1"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="px-5 py-3 border-b border-white/10">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Cerca titolo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {searchQuery.trim() ? (
                        /* Search Results */
                        <div className="p-4">
                            {filteredTitles.length === 0 ? (
                                <div className="text-center py-8 text-white/40">
                                    <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">search_off</span>
                                    Nessun titolo trovato
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {filteredTitles.map((item, idx) => (
                                        <TitleItem
                                            key={`${item.category}-${idx}`}
                                            title={item.title}
                                            category={item.category}
                                            isSelected={selectedTitles.has(item.title)}
                                            onAdd={addTitle}
                                            showCategory={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Categories View */
                        <div className="flex gap-0 h-full">
                            {/* Left Panel - Categories */}
                            <div className="w-1/3 border-r border-white/10 bg-black/20">
                                <div className="p-3 border-b border-white/10">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Categorie</span>
                                </div>
                                <div className="overflow-y-auto max-h-[45vh]">
                                    {Object.entries(categories).map(([name, data]) => {
                                        const titlesCount = getTitlesFromCategory(data).length;
                                        const isActive = selectedCategory === name;
                                        
                                        return (
                                            <button
                                                key={name}
                                                onClick={() => setSelectedCategory(name)}
                                                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all ${
                                                    isActive 
                                                        ? 'bg-purple-500/20 border-l-2 border-l-purple-500' 
                                                        : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                                }`}
                                            >
                                                <div className="text-xs font-semibold text-white truncate">{name}</div>
                                                <div className="text-[10px] text-white/40 mt-0.5">{titlesCount} titoli</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Panel - Titles */}
                            <div className="flex-1 bg-black/10">
                                <div className="p-3 border-b border-white/10">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                        {selectedCategory || 'Seleziona categoria'}
                                    </span>
                                </div>
                                <div className="overflow-y-auto max-h-[45vh] p-3">
                                    {selectedCategory ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {getTitlesFromCategory(categories[selectedCategory]).map((title, idx) => (
                                                <TitleItem
                                                    key={idx}
                                                    title={title}
                                                    isSelected={selectedTitles.has(title)}
                                                    onAdd={addTitle}
                                                    index={idx + 1}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-white/30">
                                            <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">touch_app</span>
                                            <span className="text-sm">Seleziona una categoria</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                    <div className="text-[10px] text-white/40">
                        {Object.keys(categories).length} categorie • {getAllTitles().length} titoli totali
                        {selectedCount > 0 && ` • ${selectedCount} selezionati`}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 transition-all"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TitleSelectionModal;