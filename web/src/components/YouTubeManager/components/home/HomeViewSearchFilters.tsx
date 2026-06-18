import React from 'react';

interface HomeViewSearchFiltersProps {
    filterDate: string;
    onFilterDateChange: (value: string) => void;
    sortBy: string;
    onSortByChange: (value: string) => void;
    minViews: string;
    onMinViewsChange: (value: string) => void;
    minVelocity: string;
    onMinVelocityChange: (value: string) => void;
    hideShorts: boolean;
    onHideShortsChange: (value: boolean) => void;
}

export const HomeViewSearchFilters: React.FC<HomeViewSearchFiltersProps> = ({
    filterDate,
    onFilterDateChange,
    sortBy,
    onSortByChange,
    minViews,
    onMinViewsChange,
    minVelocity,
    onMinVelocityChange,
    hideShorts,
    onHideShortsChange,
}) => {
    return (
        <div className="flex flex-wrap gap-4 justify-center items-center">
            <select
                value={filterDate}
                onChange={(e) => onFilterDateChange(e.target.value)}
                className="bg-surface border border-border-dark rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-primary outline-none"
            >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>

            <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
                className="bg-surface border border-border-dark rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-primary outline-none"
            >
                <option value="relevance">Viral Potential (Default)</option>
                <option value="views">Most Views</option>
                <option value="date">Newest First</option>
            </select>

            <div className="flex items-center gap-2 bg-surface border border-border-dark rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
                <span className="material-symbols-rounded text-[16px] text-gray-500">visibility</span>
                <input
                    type="number"
                    value={minViews}
                    onChange={(e) => onMinViewsChange(e.target.value)}
                    min="0"
                    className="bg-transparent border-none outline-none text-sm text-white w-24 placeholder-gray-500"
                />
            </div>

            <div className="flex items-center gap-2 bg-surface border border-border-dark rounded-lg px-3 py-2 focus-within:border-primary transition-colors" title="Minimum Views per Day">
                <span className="material-symbols-rounded text-[16px] text-gray-500">speed</span>
                <input
                    type="number"
                    value={minVelocity}
                    onChange={(e) => onMinVelocityChange(e.target.value)}
                    placeholder="Min Vel/Day"
                    min="0"
                    className="bg-transparent border-none outline-none text-sm text-white w-24 placeholder-gray-500"
                />
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-surface border border-border-dark rounded-lg px-3 py-2 hover:border-primary transition-colors group select-none">
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={hideShorts}
                        onChange={(e) => onHideShortsChange(e.target.checked)}
                        className="sr-only"
                    />
                    <div className={`block w-8 h-4 rounded-full transition-colors ${hideShorts ? 'bg-red-500' : 'bg-[#333] group-hover:bg-[#444]'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform ${hideShorts ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-[16px] text-gray-400">filter_list</span>
                    Filtra Brevi
                </span>
            </label>
        </div>
    );
};
