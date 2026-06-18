import React from 'react';
import { Categories, CategoryData, getTitlesFromCategory } from '../utils/titleCategories';

interface CategoryListProps {
    categories: Categories;
    editingCategory: string | null;
    showNewCategoryInput: boolean;
    newCategoryName: string;
    onSelectCategory: (name: string) => void;
    onDeleteCategory: (name: string) => void;
    onNewCategoryNameChange: (val: string) => void;
    onAddCategory: () => void;
    onShowNewCategoryInput: (show: boolean) => void;
}

export const TitleCatCategoryList: React.FC<CategoryListProps> = ({
    categories,
    editingCategory,
    showNewCategoryInput,
    newCategoryName,
    onSelectCategory,
    onDeleteCategory,
    onNewCategoryNameChange,
    onAddCategory,
    onShowNewCategoryInput,
}) => {
    return (
        <div className="w-1/3 border border-white/5 rounded-2xl bg-slate-950/40 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorie</span>
                    <button
                        onClick={() => onShowNewCategoryInput(true)}
                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all"
                        title="Nuova categoria"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                </div>
                {showNewCategoryInput && (
                    <div className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => onNewCategoryNameChange(e.target.value)}
                            placeholder="Nome categoria..."
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onAddCategory();
                                if (e.key === 'Escape') {
                                    onShowNewCategoryInput(false);
                                    onNewCategoryNameChange('');
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={onAddCategory}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition-all"
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {Object.keys(categories).map((name) => {
                    const data = categories[name];
                    const titlesCount = getTitlesFromCategory(data).length;
                    const isActive = editingCategory === name;
                    const hasSubcategories = !Array.isArray(data) && data?.type === 'category' && !!data?.subcategories;

                    return (
                        <div
                            key={name}
                            className={`group rounded-xl p-3 cursor-pointer transition-all ${
                                isActive
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : 'hover:bg-slate-800/60 border border-transparent'
                            }`}
                            onClick={() => onSelectCategory(name)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {hasSubcategories && (
                                        <span className="material-symbols-outlined text-sky-400 text-sm">folder_open</span>
                                    )}
                                    <span className="font-semibold text-slate-200 truncate text-sm">{name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteCategory(name);
                                        }}
                                        className="p-1 text-slate-600 hover:text-red-400 transition-all"
                                        title="Elimina categoria"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                                {titlesCount} titoli disponibili
                                {hasSubcategories && ` • ${Object.keys((data as CategoryData)?.subcategories || {}).length} gruppi`}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TitleCatCategoryList;
