import React from 'react';
import { Categories, CategoryData, isCategoryType, getTitlesFromCategory } from '../utils/titleCategories';

interface DetailsPanelProps {
    categories: Categories;
    editingCategory: string | null;
    activeSubcategory: string | null;
    newTitle: string;
    showNewSubcategoryInput: boolean;
    newSubcategoryName: string;
    onSelectTitles: () => void;
    onSetActiveSubcategory: (name: string | null) => void;
    onNewTitleChange: (val: string) => void;
    onAddTitle: () => void;
    onRemoveTitle: (index: number) => void;
    onShowNewSubcategoryInput: (show: boolean) => void;
    onNewSubcategoryNameChange: (val: string) => void;
    onAddSubcategory: () => void;
    onDeleteSubcategory: (name: string) => void;
}

export const TitleCatDetailsPanel: React.FC<DetailsPanelProps> = ({
    categories,
    editingCategory,
    activeSubcategory,
    newTitle,
    showNewSubcategoryInput,
    newSubcategoryName,
    onSelectTitles,
    onSetActiveSubcategory,
    onNewTitleChange,
    onAddTitle,
    onRemoveTitle,
    onShowNewSubcategoryInput,
    onNewSubcategoryNameChange,
    onAddSubcategory,
    onDeleteSubcategory,
}) => {
    if (!editingCategory) {
        return (
            <div className="flex-1 border border-white/5 rounded-2xl bg-slate-950/40 flex items-center justify-center text-slate-500">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">touch_app</span>
                    <span className="text-sm">Seleziona una categoria per gestire i titoli</span>
                </div>
            </div>
        );
    }

    const data = categories[editingCategory];
    const hasSubcategories = isCategoryType(data);
    const subcategories = hasSubcategories ? Object.keys((data as CategoryData)?.subcategories || {}) : [];
    const displayTitles = getDisplayTitles(categories, editingCategory, activeSubcategory);

    return (
        <div className="flex-1 border border-white/5 rounded-2xl bg-slate-950/40 flex flex-col overflow-hidden">
            {/* Category Header */}
            <div className="p-3 border-b border-white/5 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">edit</span>
                        <span className="font-bold text-slate-200">{editingCategory}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasSubcategories && (
                            <button
                                onClick={() => onShowNewSubcategoryInput(true)}
                                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Nuovo Gruppo
                            </button>
                        )}
                        <button
                            onClick={onSelectTitles}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                        >
                            USA TITOLI
                        </button>
                    </div>
                </div>
                {showNewSubcategoryInput && (
                    <div className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={newSubcategoryName}
                            onChange={(e) => onNewSubcategoryNameChange(e.target.value)}
                            placeholder="Nome gruppo..."
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onAddSubcategory();
                                if (e.key === 'Escape') {
                                    onShowNewSubcategoryInput(false);
                                    onNewSubcategoryNameChange('');
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={onAddSubcategory}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all"
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>

            {/* Subcategories Tabs */}
            {hasSubcategories && (
                <div className="px-3 pt-2 border-b border-white/5 bg-slate-900/30">
                    <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2">
                        {subcategories.map((subcat) => (
                            <div
                                key={subcat}
                                className={`group flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                    activeSubcategory === subcat
                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                        : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 border border-transparent'
                                }`}
                                onClick={() => onSetActiveSubcategory(subcat)}
                            >
                                <span>{subcat}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSubcategory(subcat);
                                    }}
                                    className="ml-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Titles List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="mb-3 flex gap-2">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => onNewTitleChange(e.target.value)}
                        placeholder="Aggiungi nuovo titolo..."
                        className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddTitle();
                        }}
                    />
                    <button
                        onClick={onAddTitle}
                        disabled={!newTitle.trim()}
                        className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                </div>

                <div className="space-y-2">
                    {displayTitles.map((title, idx) => (
                        <div
                            key={idx}
                            className="group flex items-start gap-3 bg-slate-800/30 border border-white/5 rounded-xl p-3 hover:border-amber-500/20 hover:bg-slate-800/50 transition-all"
                        >
                            <div className="text-[9px] font-black text-slate-600 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 shrink-0 mt-0.5">
                                {idx + 1}
                            </div>
                            <div className="flex-1 text-xs text-slate-300 leading-relaxed">
                                {title}
                            </div>
                            <button
                                onClick={() => onRemoveTitle(idx)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all shrink-0"
                                title="Rimuovi titolo"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    ))}
                    {displayTitles.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">stylus_note</span>
                            <span className="text-xs">Nessun titolo. Aggiungi il primo!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getDisplayTitles = (categories: Categories, catName: string, activeSubcategory: string | null): string[] => {
    const data = categories[catName];
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.type === 'category' && activeSubcategory && data.subcategories) {
        return data.subcategories[activeSubcategory] || [];
    }
    if (data.type === 'simple' && data.titles) return data.titles;
    if (data.titles) return data.titles;
    return [];
};

export default TitleCatDetailsPanel;
