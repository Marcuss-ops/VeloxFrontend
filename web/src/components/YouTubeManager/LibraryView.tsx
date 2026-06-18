import React from 'react';
import { youtubeApi } from '../../lib/api';
import { useLibraryView } from './hooks/useLibraryView';
import { LibraryList } from './LibraryList';

export const LibraryView: React.FC = () => {
    const view = useLibraryView();

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-1">Your Groups</h2>
                    <p className="text-gray-400 text-sm">Organize and manage your tracked channels</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Selection Mode Toggle */}
                    <button
                        onClick={() => { view.setSelectionMode(!view.selectionMode); if (view.selectionMode) view.deselectAll(); }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view.selectionMode ? 'bg-purple-600 text-white' : 'bg-[#222] text-gray-300 hover:bg-[#333]'}`}
                    >
                        <span className="material-symbols-rounded text-[18px]">checklist</span>
                        {view.selectionMode ? 'Annulla' : 'Selezione'}
                    </button>

                    <select
                        value={view.dateFilter}
                        onChange={(e) => view.setDateFilter(e.target.value)}
                        className="bg-[#111] border border-border-dark rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-purple-500 transition-all outline-none"
                    >
                        <option value="today">Ultime 24h</option>
                        <option value="week">Ultimi 7 Giorni</option>
                        <option value="twoweeks">Ultimi 14 Giorni</option>
                        <option value="month">Ultimi 28 Giorni</option>
                    </select>

                    <button
                        onClick={async () => {
                            const name = window.prompt("New Group Name:");
                            if (name) {
                                try {
                                    await youtubeApi.createManagerGroup(name);
                                    view.fetchGroups();
                                } catch (e) {
                                    console.error("Failed to create group", e);
                                }
                            }
                        }}
                        className="bg-[#222] hover:bg-white hover:text-black text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <span className="material-symbols-rounded text-[18px]">create_new_folder</span>
                        New Group
                    </button>
                </div>
            </div>

            <LibraryList {...view} />
        </div>
    );
};