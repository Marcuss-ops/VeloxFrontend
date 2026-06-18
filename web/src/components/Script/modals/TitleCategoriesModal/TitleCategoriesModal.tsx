import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTitleCategories } from './hooks/useTitleCategories';
import { CategoryList } from './components/CategoryList';
import { TitleList } from './components/TitleList';

interface TitleCategoriesModalProps {
    onSelectTitles: (titles: string[]) => void;
}

export const TitleCategoriesModal: React.FC<TitleCategoriesModalProps> = ({ onSelectTitles }) => {
    const {
        categories,
        isOpen,
        setIsOpen,
        editingCategory,
        setEditingCategory,
        newTitle,
        setNewTitle,
        newCategoryName,
        setNewCategoryName,
        showNewCategoryInput,
        setShowNewCategoryInput,
        activeSubcategory,
        setActiveSubcategory,
        newSubcategoryName,
        setNewSubcategoryName,
        showNewSubcategoryInput,
        setShowNewSubcategoryInput,
        handleSelectCategory,
        deleteCategory,
        addTitleToCategory,
        removeTitleFromCategory,
        addNewCategory,
        addSubcategory,
        deleteSubcategory,
        getDisplayTitles,
        getSubcategories,
        isCategoryType,
        getTitlesFromCategory,
    } = useTitleCategories(onSelectTitles);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/20"
                >
                    <span className="material-symbols-outlined text-lg">folder_managed</span>
                    Gestisci Categorie
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-900 border-white/10 text-white shadow-2xl rounded-[32px] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500">category</span>
                        Categorie Titoli
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Seleziona, crea o elimina categorie di titoli da applicare rapidamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-4 mt-4 h-[65vh]">
                    <CategoryList
                        categories={categories}
                        editingCategory={editingCategory}
                        showNewCategoryInput={showNewCategoryInput}
                        newCategoryName={newCategoryName}
                        onSetEditingCategory={setEditingCategory}
                        onSetShowNewCategoryInput={setShowNewCategoryInput}
                        onSetNewCategoryName={setNewCategoryName}
                        onAddNewCategory={addNewCategory}
                        onDeleteCategory={deleteCategory}
                        onSetActiveSubcategory={setActiveSubcategory}
                        getTitlesFromCategory={getTitlesFromCategory}
                        isCategoryType={isCategoryType}
                    />
                    <TitleList
                        categories={categories}
                        editingCategory={editingCategory}
                        activeSubcategory={activeSubcategory}
                        showNewSubcategoryInput={showNewSubcategoryInput}
                        newSubcategoryName={newSubcategoryName}
                        newTitle={newTitle}
                        onSetNewTitle={setNewTitle}
                        onSetActiveSubcategory={setActiveSubcategory}
                        onSetShowNewSubcategoryInput={setShowNewSubcategoryInput}
                        onSetNewSubcategoryName={setNewSubcategoryName}
                        onHandleSelectCategory={handleSelectCategory}
                        onAddTitleToCategory={addTitleToCategory}
                        onRemoveTitleFromCategory={removeTitleFromCategory}
                        onAddSubcategory={addSubcategory}
                        onDeleteSubcategory={deleteSubcategory}
                        getDisplayTitles={getDisplayTitles}
                        getSubcategories={getSubcategories}
                        isCategoryType={isCategoryType}
                    />
                </div>

                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-[14px] text-xs font-bold transition-all"
                    >
                        Chiudi
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};