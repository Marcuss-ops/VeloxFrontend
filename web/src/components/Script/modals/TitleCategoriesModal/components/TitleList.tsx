import React from 'react';
import { Categories, CategoryData } from '../../../data/titleCategoriesData';

interface TitleListProps {
    categories: Categories;
    editingCategory: string | null;
    activeSubcategory: string | null;
    showNewSubcategoryInput: boolean;
    newSubcategoryName: string;
    newTitle: string;
    onSetNewTitle: (title: string) => void;
    onSetActiveSubcategory: (name: string | null) => void;
    onSetShowNewSubcategoryInput: (show: boolean) => void;
    onSetNewSubcategoryName: (name: string) => void;
    onHandleSelectCategory: (name: string) => void;
    onAddTitleToCategory: (name: string) => void;
    onRemoveTitleFromCategory: (name: string, idx: number) => void;
    onAddSubcategory: (name: string) => void;
    onDeleteSubcategory: (name: string, subcatName: string) => void;
    getDisplayTitles: (name: string) => string[];
    getSubcategories: (name: string) => string[];
    isCategoryType: (data: string[] | CategoryData | undefined) => boolean;
}

export const TitleList: React.FC<TitleListProps> = ({
    categories,
    editingCategory,
    activeSubcategory,
    showNewSubcategoryInput,
    newSubcategoryName,
    newTitle,
    onSetNewTitle,
    onSetActiveSubcategory,
    onSetShowNewSubcategoryInput,
    onSetNewSubcategoryName,
    onHandleSelectCategory,
    onAddTitleToCategory,
    onRemoveTitleFromCategory,
    onAddSubcategory,
    onDeleteSubcategory,
    getDisplayTitles,
    getSubcategories,
    isCategoryType,
}) => {
    if (!editingCategory) {
        return (
            <div className="flex-1 border border-white/5 rounded-2xl bg-slate-950/40 flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">touch_app</span>
                        <span className="text-sm">Seleziona una categoria per gestire i titoli</span>
                    </div>
                </div>
            </div>
        );
    }

    const displayTitles = getDisplayTitles(editingCategory);
    const subcategories = getSubcategories(editingCategory);
    const isCatType = isCategoryType(categories[editingCategory]);

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
                        {isCatType && (
                            <button
                                onClick={() => onSetShowNewSubcategoryInput(true)}
                                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Nuovo Gruppo
                            </button>
                        )}
                        <button
                            onClick={() => onHandleSelectCategory(editingCategory)}
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
                            onChange={(e) => onSetNewSubcategoryName(e.target.value)}
                            placeholder="Nome gruppo..."
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onAddSubcategory(editingCategory);
                                if (e.key === 'Escape') {
                                    onSetShowNewSubcategoryInput(false);
                                    onSetNewSubcategoryName('');
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => onAddSubcategory(editingCategory)}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all"
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>

            {/* Subcategories Tabs */}
            {isCatType && (
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
                                        onDeleteSubcategory(editingCategory, subcat);
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
                {/* Add Title Input */}
                <div className="mb-3 flex gap-2">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => onSetNewTitle(e.target.value)}
                        placeholder="Aggiungi nuovo titolo..."
                        className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAddTitleToCategory(editingCategory);
                        }}
                    />
                    <button
                        onClick={() => onAddTitleToCategory(editingCategory)}
                        disabled={!newTitle.trim()}
                        className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                </div>

                {/* Titles Grid */}
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
                                onClick={() => onRemoveTitleFromCategory(editingCategory, idx)}
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