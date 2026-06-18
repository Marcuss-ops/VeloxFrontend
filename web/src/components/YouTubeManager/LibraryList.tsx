import React from 'react';
import { GroupFeed } from './GroupFeed';
import { Channel, Group } from './utils/libraryView';
import { UseLibraryViewReturn } from './hooks/useLibraryView';

type LibraryListProps = UseLibraryViewReturn;

export const LibraryList: React.FC<LibraryListProps> = ({
    groups,
    isLoading,
    dateFilter,
    expandedGroups,
    suggestedChannels,
    selectedChannels,
    selectionMode,
    showMoveModal,
    moveTargetGroup,
    draggedChannel,
    dropTarget,
    allGroupNames,
    toggleGroup,
    fetchGroups,
    toggleChannelSelection,
    selectAllInGroup,
    deselectAll,
    deleteSelectedChannels,
    moveSelectedChannels,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDeleteGroup,
    setShowMoveModal,
    setMoveTargetGroup,
    setSelectionMode,
}) => {
    return (
        <>
            {/* Bulk Actions Toolbar */}
            {selectionMode && selectedChannels.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-purple-600/95 backdrop-blur-lg px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-purple-400/30">
                    <span className="text-white font-bold">{selectedChannels.size} selezionati</span>
                    <div className="h-6 w-px bg-white/20" />
                    <button
                        onClick={() => setShowMoveModal(true)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <span className="material-symbols-rounded text-[16px]">drive_file_move</span>
                        Sposta
                    </button>
                    <button
                        onClick={deleteSelectedChannels}
                        className="px-3 py-1.5 bg-red-500/50 hover:bg-red-500/70 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <span className="material-symbols-rounded text-[16px]">delete</span>
                        Elimina
                    </button>
                    <div className="h-6 w-px bg-white/20" />
                    <button
                        onClick={deselectAll}
                        className="text-white/70 hover:text-white text-sm transition-colors"
                    >
                        Deseleziona
                    </button>
                </div>
            )}

            {/* Move Modal */}
            {showMoveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-rounded text-purple-400">drive_file_move</span>
                            Sposta in gruppo
                        </h3>
                        <select
                            value={moveTargetGroup}
                            onChange={e => setMoveTargetGroup(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-3 text-white mb-4 outline-none focus:border-purple-500"
                        >
                            <option value="">Seleziona gruppo...</option>
                            {allGroupNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowMoveModal(false); setMoveTargetGroup(''); }}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => moveSelectedChannels(moveTargetGroup)}
                                disabled={!moveTargetGroup}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-gray-500 rounded-lg text-white font-medium transition-colors"
                            >
                                Sposta {selectedChannels.size} canali
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <span className="material-symbols-rounded animate-spin text-3xl text-gray-500">progress_activity</span>
                    <p className="text-gray-500 mt-2">Loading groups...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(groups).length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-[#222] rounded-xl bg-gradient-to-b from-slate-900/50 to-transparent">
                            <span className="material-symbols-rounded text-6xl text-purple-500/50 mb-4">folder_off</span>
                            <h3 className="text-xl font-bold text-white mb-2">Nessun gruppo creato</h3>
                            <p className="text-gray-400 max-w-md mx-auto mb-6">
                                I gruppi ti aiutano a organizzare i canali competitor per categoria.
                                Crea il tuo primo gruppo per iniziare a monitorare i video della concorrenza.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={async () => {
                                        const name = window.prompt("Nome del primo gruppo (es. Rap, Gaming, Tech):");
                                        if (name) {
                                            try {
                                                await (await import('../../lib/api')).youtubeApi.createManagerGroup(name);
                                                fetchGroups();
                                            } catch (e) {
                                                console.error("Failed to create group", e);
                                            }
                                        }
                                    }}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-[20px]">create_new_folder</span>
                                    Crea il tuo primo gruppo
                                </button>
                                <button
                                    onClick={() => {
                                        if ((window as any).openQuickAddChannelModal) {
                                            (window as any).openQuickAddChannelModal(null);
                                        }
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-[20px]">explore</span>
                                    Scopri canali
                                </button>
                            </div>
                        </div>
                    ) : (
                        Object.entries(groups).map(([groupName, groupData]: [string, Group]) => (
                            <div
                                key={groupName}
                                className={`bg-[#111] rounded-2xl border overflow-hidden group/main transition-all ${dropTarget === groupName ? 'border-purple-500 border-2' : 'border-border-dark'}`}
                                onDragOver={(e) => handleDragOver(e, groupName)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, groupName)}
                            >
                                {/* Drop Zone Indicator */}
                                {dropTarget === groupName && draggedChannel && draggedChannel.sourceGroup !== groupName && (
                                    <div className="absolute inset-0 bg-purple-500/10 z-10 flex items-center justify-center pointer-events-none">
                                        <span className="text-purple-400 font-bold text-lg">Rilascia per spostare qui</span>
                                    </div>
                                )}

                                <div
                                    className="px-6 py-4 border-b border-border-dark bg-white/5 flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer select-none"
                                    onClick={() => toggleGroup(groupName)}
                                >
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <span className={`material-symbols-rounded text-purple-500 transition-transform duration-300 ${expandedGroups[groupName] ? 'rotate-180' : ''}`}>expand_more</span>
                                        {groupName}
                                        <span className="text-xs bg-[#222] text-gray-400 px-2 py-1 rounded-full">{(groupData as any).channels?.length || 0}</span>
                                    </h3>

                                    <div className="flex items-center gap-2 opacity-0 group-hover/main:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        {(selectionMode && (groupData as any).channels && (groupData as any).channels.length > 0) && (
                                            <button
                                                onClick={() => selectAllInGroup(groupName, (groupData as any).channels)}
                                                className="p-2 hover:bg-purple-600/30 rounded-lg text-gray-400 hover:text-purple-300 transition-colors"
                                                title="Seleziona tutti"
                                            >
                                                <span className="material-symbols-rounded text-[18px]">select_all</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => (window as any).openQuickAddChannelModal?.(groupName)}
                                            className="p-2 hover:bg-[#222] rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                            title="Add Channels"
                                        >
                                            <span className="material-symbols-rounded text-[18px]">add</span> <span className="text-xs">Aggiungi Canale</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteGroup(groupName)}
                                            className="p-2 hover:bg-red-900/50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete Group"
                                        >
                                            <span className="material-symbols-rounded text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className={`transition-all duration-300 ${expandedGroups[groupName] ? 'block' : 'hidden'}`}>
                                    <div className="p-6">
                                        {(!groupData || !groupData.channels || groupData.channels.length === 0) ? (
                                            <div className="py-10 bg-slate-900/30 rounded-lg">
                                                <div className="text-center mb-6">
                                                    <span className="material-symbols-rounded text-5xl text-gray-600 mb-3">person_off</span>
                                                    <h4 className="text-base font-semibold text-gray-300 mb-2">Nessun canale in questo gruppo</h4>
                                                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                                        Aggiungi canali competitor per monitorare i loro video e analizzare le loro strategie.
                                                    </p>
                                                </div>

                                                {/* Suggested Channels */}
                                                {suggestedChannels[groupName] && suggestedChannels[groupName].length > 0 && (
                                                    <div className="px-6">
                                                        <h5 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                                            <span className="material-symbols-rounded text-[16px] text-purple-400">auto_awesome</span>
                                                            Canali suggeriti per te
                                                        </h5>
                                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                                            {suggestedChannels[groupName].map((ch: any, idx: number) => (
                                                                <div key={idx} className="flex-shrink-0 w-48 bg-slate-800/80 rounded-lg p-3 border border-slate-700 hover:border-purple-500 transition-colors">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                                                            {ch.thumbnail ? (
                                                                                <img src={ch.thumbnail} className="w-full h-full object-cover" alt="" />
                                                                            ) : (
                                                                                <span className="material-symbols-rounded text-gray-500 text-[18px]">person</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-medium text-white truncate" title={ch.title}>{ch.title}</p>
                                                                            {ch.velocity && (
                                                                                <p className="text-[10px] text-emerald-400">{ch.velocity.toLocaleString()} views/video</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <a
                                                                            href={ch.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex-1 text-center text-xs text-gray-400 hover:text-white py-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                                                                        >
                                                                            Vedi
                                                                        </a>
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    const resolveResp = await fetch(`/api/youtube/manager/resolve?url=${encodeURIComponent(ch.url)}`);
                                                                                    const resolveData = await resolveResp.json();
                                                                                    if (resolveData.ok) {
                                                                                        const channelId = resolveData.channel_url?.split('/').pop() || ch.title;
                                                                                        await (await import('../../lib/api')).youtubeApi.addChannelToManagerGroup(
                                                                                            groupName,
                                                                                            channelId,
                                                                                            { url: ch.url, title: ch.title, thumbnail: ch.thumbnail }
                                                                                        );
                                                                                        fetchGroups();
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error('Failed to add suggested channel:', err);
                                                                                }
                                                                            }}
                                                                            className="flex-1 text-center text-xs text-purple-400 hover:text-purple-300 py-1.5 rounded bg-purple-900/30 hover:bg-purple-900/50 transition-colors"
                                                                        >
                                                                            + Aggiungi
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-center mt-6">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if ((window as any).openQuickAddChannelModal) {
                                                                (window as any).openQuickAddChannelModal(groupName);
                                                            }
                                                        }}
                                                        className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                                                    >
                                                        <span className="material-symbols-rounded text-[18px]">person_add</span>
                                                        Aggiungi Canale
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                                {groupData.channels.map((ch: any) => {
                                                    const channelKey = `${groupName}:${ch.id}`;
                                                    const isSelected = selectedChannels.has(channelKey);

                                                    return (
                                                        <div
                                                            key={ch.id}
                                                            draggable={!selectionMode}
                                                            onDragStart={(e) => !selectionMode && handleDragStart(e, ch, groupName)}
                                                            className={`relative flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-purple-600/30 border-purple-500' : 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525] hover:border-[#333]'}`}
                                                            onClick={() => selectionMode ? toggleChannelSelection(channelKey) : window.open(ch.url, '_blank')}
                                                        >
                                                            {/* Selection Checkbox */}
                                                            {selectionMode && (
                                                                <div className={`absolute -left-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-purple-600 border-purple-400' : 'bg-slate-800 border-slate-600'}`}>
                                                                    {isSelected && <span className="material-symbols-rounded text-[10px] text-white">check</span>}
                                                                </div>
                                                            )}

                                                            {/* Delete Button */}
                                                            {!selectionMode && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if ((window as any).deleteChannel) {
                                                                            (window as any).deleteChannel(groupName, ch.id);
                                                                        }
                                                                    }}
                                                                    className="absolute -right-1 -top-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
                                                                    title="Rimuovi"
                                                                >
                                                                    <span className="material-symbols-rounded text-[10px]">close</span>
                                                                </button>
                                                            )}

                                                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#111] flex items-center justify-center">
                                                                {ch.thumbnail ? (
                                                                    <img src={ch.thumbnail} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="material-symbols-rounded text-[12px] text-gray-500">person</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-medium text-[11px] text-gray-300 truncate leading-tight" title={ch.title}>{ch.title}</h4>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Inject TubeAI Feed here if channels exist */}
                                        {groupData.channels && groupData.channels.length > 0 && (
                                            <GroupFeed groupName={groupName} dateFilter={dateFilter} channels={groupData.channels} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
};