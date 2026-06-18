export interface CategoryData {
    type?: 'simple' | 'category';
    titles?: string[];
    subcategories?: Record<string, string[]>;
}

export type Categories = Record<string, string[] | CategoryData>;

export const STORAGE_KEY = 'title_categories_v2';

export const DEFAULT_CATEGORIES: Categories = {
    'Courtroom Chaos': [
        'Judge DESTROYED by Evidence',
        'Courtroom MELTDOWN Caught on Camera',
        'Justice SERVED: The Verdict That Shocked Everyone',
        'Attorney CAUGHT Lying in Court',
        'The Moment That Changed EVERYTHING',
        'Witness BREAKS DOWN on Stand',
        'Judge Drops BOMBSHELL Ruling',
    ],
    'Collapses & Faints': [
        'Moment of SHOCK: {X} Collapses',
        'Caught on Camera: The Collapse That Stunned Everyone',
        '{X} FAINTS Live on Air',
        'The Collapse No One Saw Coming',
        'Dramatic Moment {X} Falls on Stage',
        'Health Scare: {X} Collapses During Event',
        'Breaking: {X} Rushed to Hospital After Collapse',
    ],
    'Bodycam & Police Action': [
        'Bodycam Footage They DIDNT Want You to See',
        'Police Officer CAUGHT on Bodycam',
        'The Bodycam Video That Went VIRAL',
        'Shocking Police Encounter Caught on Camera',
        'Officer Reacts to UNBELIEVABLE Situation',
        'Bodycam: The Moment Everything Changed',
        'Police Raid Goes WRONG',
    ],
    'Snitching & Leaks': [
        'SNITCH EXPOSED: The Truth Revealed',
        'Leaked Audio SHOCKS Everyone',
        'The Leak That Destroyed {X}',
        'Insider REVEALS Everything',
        'Confidential Documents LEAKED',
        'Whistleblower Comes FORWARD',
        'The Secret They Tried to HIDE',
    ],
    'Arrests & Raids': [
        'DRAMATIC Arrest Caught on Camera',
        'Police RAID Goes Viral',
        'The Arrest That Shocked Everyone',
        '{X} ARRESTED: The Full Story',
        'FBI Raid Uncovers SHOCKING Evidence',
        'Moment of Arrest: What Really Happened',
        'Multiple ARRESTS in Major Operation',
    ],
    'Explosive Evidence & Hidden Finds': [
        'Evidence Found That CHANGES Everything',
        'Hidden Camera Reveals the TRUTH',
        'The Discovery That BROKE the Case',
        'What They Found Will SHOCK You',
        'Secret Evidence EXPOSED',
        'Buried Treasure of Evidence FOUND',
        'The Hidden File That Changed History',
    ],
    'Prison & Transfers': [
        'Prison Life: What Really Happens Inside',
        '{X} Transfered to Maximum Security',
        'The Prison Escape They Didnt Report',
        'Inside the Most DANGEROUS Prison',
        'Prison Guard REVEALS Secrets',
        'Transfer GONE WRONG',
        'Life After Prison: The Untold Story',
    ],
    'Leaked Footage & Viral Clips': [
        'LEAKED: The Video They BANNED',
        'Viral Clip BREAKS the Internet',
        'The Footage Everyone is Talking About',
        'Deleted Video RECOVERED',
        'Leaked Recording Goes VIRAL',
        'The Clip That Changed Everything',
        'EXPOSED: What Was Hidden',
    ],
    'Testimonies & Betrayals': [
        'Witness Testimony SHOCKS Court',
        'The BETRAYAL That Destroyed Everything',
        '{X} BREAKS SILENCE for First Time',
        'Testimony Reveals DARK Secrets',
        'Friend Turns ENEMY: The Betrayal',
        'Under Oath: The Truth Comes OUT',
        'The Witness Who Changed EVERYTHING',
    ],
    'Trending': [
        'This Is TRENDING For A Reason',
        'Everyone Is Talking About THIS',
        'The Video Taking Over The Internet',
        'Why {X} Is Going VIRAL Right Now',
        'Breaking: The Story Everyone Needs to See',
        'The Moment That BROKE The Internet',
        'Trending NOW: What You Need to Know',
        'Viral Sensation: The Full Story',
        'The Clip Everyone Is Sharing',
        'This Changed EVERYTHING Overnight',
        'The Story Behind The Viral Moment',
        'Why This Is Getting So Much Attention',
        'The Internet Cant Stop Talking About This',
        'From Unknown To VIRAL Overnight',
        'The Post That Broke Records',
        'Everyone Needs To See This RIGHT NOW',
        'The Trend That Wont Stop',
        'What Makes This So SPECIAL',
        'The Viral Video They Tried To Hide',
        'This Is What Everyone Is Watching',
        'The Moment That Defined The Week',
        'Why This Matters NOW',
        'The Story That Captured Everyones Attention',
        'Breaking The Internet: The Full Story',
        'The Viral Phenomenon Explained',
    ],
};

export const getTitlesFromCategory = (data: string[] | CategoryData | undefined): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.type === 'simple' && data.titles) return data.titles;
    if (data.type === 'category' && data.subcategories) return Object.values(data.subcategories).flat();
    return [];
};

export const isCategoryType = (data: string[] | CategoryData | undefined): boolean => {
    if (!data) return false;
    if (Array.isArray(data)) return false;
    return data.type === 'category' && !!data.subcategories;
};

export const loadCategories = (): Categories => {
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

interface WindowWithSaveCategories extends Window {
    saveTitleCategories?: (categories: Categories) => void;
}

export const saveCategories = (newCats: Categories): void => {
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
};
