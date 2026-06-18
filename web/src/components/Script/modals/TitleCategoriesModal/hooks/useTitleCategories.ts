import { useState, useEffect, useCallback } from 'react';
import {
    Categories,
    CategoryData,
    DEFAULT_CATEGORIES,
    STORAGE_KEY,
} from '../../../data/titleCategoriesData';

interface WindowWithSaveCategories extends Window {
    saveTitleCategories?: (categories: Categories) => void;
}

// Merge stored categories with defaults
const loadCategories = (): Categories => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_CATEGORIES, ...parsed };
        }
    } catch (e) {
        console.error('Error loading categories:', e);
    }
    return { ...DEFAULT_CATEGORIES };
};

export const useTitleCategories = (onSelectTitles: (titles: string[]) => void) => {
    const [categories, setCategories] = useState<Categories>({});
    const [isOpen, setIsOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCategories(loadCategories());
        }
    }, [isOpen]);

    const saveCategories = useCallback((newCats: Categories) => {
        setCategories(newCats);
        const customCategories: Categories = {};
        for (const [key, value] of Object.entries(newCats)) {
            if (JSON.stringify(DEFAULT_CATEGORIES[key]) !== JSON.stringify(value)) {
                customCategories[key] = value;
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customCategories));
        if (typeof (window as WindowWithSaveCategories).saveTitleCategories === 'function') {
            (window as WindowWithSaveCategories).saveTitleCategories!(newCats);
        }
    }, []);

    const handleSelectCategory = useCallback((catName: string) => {
        const data = categories[catName];
        if (!data) return;

        let titles: string[] = [];
        if (Array.isArray(data)) {
            titles = data;
        } else if (data.type === 'simple' && data.titles) {
            titles = data.titles;
        } else if (data.type === 'category' && data.subcategories) {
            titles = Object.values(data.subcategories).flat() as string[];
        }

        if (titles.length > 0) {
            onSelectTitles(titles);
            setIsOpen(false);
        }
    }, [categories, onSelectTitles]);

    const deleteCategory = useCallback((catName: string) => {
        if (!confirm(`Eliminare la categoria "${catName}"?`)) return;
        const newCats = { ...categories };
        delete newCats[catName];
        saveCategories(newCats);
    }, [categories, saveCategories]);

    const getTitlesFromCategory = useCallback((data: string[] | CategoryData | undefined): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.type === 'simple' && data.titles) return data.titles;
        if (data.type === 'category' && data.subcategories) return Object.values(data.subcategories).flat() as string[];
        return [];
    }, []);

    const updateCategoryTitles = useCallback((catName: string, titles: string[]) => {
        const data = categories[catName];
        if (!data) return;

        if (Array.isArray(data)) {
            saveCategories({ ...categories, [catName]: titles });
        } else if (data.type === 'simple' || !data.type) {
            saveCategories({
                ...categories,
                [catName]: { ...data, type: 'simple', titles }
            });
        } else if (data.type === 'category' && activeSubcategory && data.subcategories) {
            saveCategories({
                ...categories,
                [catName]: {
                    ...data,
                    subcategories: {
                        ...data.subcategories,
                        [activeSubcategory]: titles
                    }
                }
            });
        }
    }, [categories, activeSubcategory, saveCategories]);

    const addTitleToCategory = useCallback((catName: string) => {
        if (!newTitle.trim()) return;
        const currentTitles = getTitlesFromCategory(categories[catName]);
        if (activeSubcategory && (categories[catName] as CategoryData)?.type === 'category') {
            const data = categories[catName] as CategoryData;
            const subcatTitles = data.subcategories?.[activeSubcategory] || [];
            saveCategories({
                ...categories,
                [catName]: {
                    ...data,
                    subcategories: {
                        ...data.subcategories,
                        [activeSubcategory]: [...subcatTitles, newTitle.trim()]
                    }
                }
            });
        } else {
            updateCategoryTitles(catName, [...currentTitles, newTitle.trim()]);
        }
        setNewTitle('');
    }, [newTitle, activeSubcategory, categories, getTitlesFromCategory, saveCategories, updateCategoryTitles]);

    const removeTitleFromCategory = useCallback((catName: string, titleIndex: number) => {
        const data = categories[catName];
        if (!data) return;

        if (Array.isArray(data)) {
            const newTitles = data.filter((_: string, i: number) => i !== titleIndex);
            saveCategories({ ...categories, [catName]: newTitles });
        } else if (data.type === 'simple' && data.titles) {
            const newTitles = data.titles.filter((_: string, i: number) => i !== titleIndex);
            saveCategories({ ...categories, [catName]: { ...data, titles: newTitles } });
        } else if (data.type === 'category' && activeSubcategory && data.subcategories) {
            const subcatTitles = data.subcategories[activeSubcategory] || [];
            saveCategories({
                ...categories,
                [catName]: {
                    ...data,
                    subcategories: {
                        ...data.subcategories,
                        [activeSubcategory]: subcatTitles.filter((_: string, i: number) => i !== titleIndex)
                    }
                }
            });
        }
    }, [categories, activeSubcategory, saveCategories]);

    const addNewCategory = useCallback(() => {
        if (!newCategoryName.trim()) return;
        if (categories[newCategoryName.trim()]) {
            alert('Una categoria con questo nome esiste già!');
            return;
        }
        saveCategories({ ...categories, [newCategoryName.trim()]: [] });
        setNewCategoryName('');
        setShowNewCategoryInput(false);
    }, [newCategoryName, categories, saveCategories]);

    const addSubcategory = useCallback((catName: string) => {
        if (!newSubcategoryName.trim()) return;
        const data = categories[catName];
        if (!data) return;

        const categoryData: CategoryData = Array.isArray(data)
            ? { type: 'category', subcategories: { 'Generale': data } }
            : { ...data, type: 'category', subcategories: data.subcategories || {} };

        if (categoryData.subcategories?.[newSubcategoryName.trim()]) {
            alert('Una sottocategoria con questo nome esiste già!');
            return;
        }

        saveCategories({
            ...categories,
            [catName]: {
                ...categoryData,
                subcategories: {
                    ...categoryData.subcategories,
                    [newSubcategoryName.trim()]: []
                }
            }
        });
        setNewSubcategoryName('');
        setShowNewSubcategoryInput(false);
    }, [newSubcategoryName, categories, saveCategories]);

    const deleteSubcategory = useCallback((catName: string, subcatName: string) => {
        if (!confirm(`Eliminare la sottocategoria "${subcatName}"?`)) return;
        const data = categories[catName] as CategoryData;
        if (!data?.subcategories) return;

        const newSubcats = { ...data.subcategories };
        delete newSubcats[subcatName];
        saveCategories({
            ...categories,
            [catName]: { ...data, subcategories: newSubcats }
        });
        if (activeSubcategory === subcatName) {
            setActiveSubcategory(null);
        }
    }, [categories, activeSubcategory, saveCategories]);

    const getDisplayTitles = useCallback((catName: string): string[] => {
        const data = categories[catName];
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.type === 'category' && activeSubcategory && data.subcategories) {
            return data.subcategories[activeSubcategory] || [];
        }
        if (data.type === 'simple' && data.titles) return data.titles;
        if (data.titles) return data.titles;
        return [];
    }, [categories, activeSubcategory]);

    const getSubcategories = useCallback((catName: string): string[] => {
        const data = categories[catName];
        if (!data || Array.isArray(data) || !data.subcategories) return [];
        return Object.keys(data.subcategories);
    }, [categories]);

    const isCategoryType = useCallback((data: string[] | CategoryData | undefined): boolean => {
        if (!data) return false;
        if (Array.isArray(data)) return false;
        return data.type === 'category' && !!data.subcategories;
    }, []);

    return {
        // State
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
        // Actions
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
    };
};
