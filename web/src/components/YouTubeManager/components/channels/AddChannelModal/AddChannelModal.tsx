import React from 'react';
import { useAddChannel } from './hooks/useAddChannel';
import { ChannelSearchForm } from './components/ChannelSearchForm';

export interface AddChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string | null;
    onAddChannel: (group: string, channelId: string, url: string, title: string, thumbnail?: string) => void;
}

export const AddChannelModal: React.FC<AddChannelModalProps> = ({
    isOpen,
    onClose,
    groupName,
    onAddChannel,
}) => {
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        manualUrl,
        setManualUrl,
        activeTab,
        setActiveTab,
        bulkInput,
        setBulkInput,
        bulkImporting,
        bulkResults,
        expandedChannel,
        channelVideos,
        loadingVideos,
        handleSearch,
        toggleChannelExpand,
        handleAddChannel,
        handleManualAdd,
        handleBulkImport,
    } = useAddChannel(isOpen, groupName, onAddChannel, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-purple-500/30 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-purple-400 text-[24px]">person_add</span>
                        <div>
                            <h3 className="text-lg font-bold text-white">Aggiungi Canale</h3>
                            {groupName && <p className="text-xs text-gray-500">Gruppo: {groupName}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded">close</span></button>
                </div>

                <div className="flex border-b border-white/10">
                    <button onClick={() => setActiveTab('search')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'search' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
                        <span className="material-symbols-rounded text-[16px] mr-2 align-middle">search</span>
                        Cerca Canale
                    </button>
                    <button onClick={() => setActiveTab('manual')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
                        <span className="material-symbols-rounded text-[16px] mr-2 align-middle">link</span>
                        Aggiungi da URL
                    </button>
                    <button onClick={() => setActiveTab('bulk')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'bulk' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
                        <span className="material-symbols-rounded text-[16px] mr-2 align-middle">playlist_add</span>
                        Importa Multipli
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'search' && (
                        <ChannelSearchForm
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            searchResults={searchResults}
                            isSearching={isSearching}
                            expandedChannel={expandedChannel}
                            channelVideos={channelVideos}
                            loadingVideos={loadingVideos}
                            onSearch={handleSearch}
                            onToggleExpand={toggleChannelExpand}
                            onAddChannel={handleAddChannel}
                        />
                    )}
                    {activeTab === 'manual' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">Incolla l'URL del canale:</p>
                            <input
                                type="text"
                                value={manualUrl}
                                onChange={e => setManualUrl(e.target.value)}
                                placeholder="https://www.youtube.com/@channelname"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500"
                            />
                            <button
                                onClick={handleManualAdd}
                                disabled={!manualUrl.trim() || !groupName}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Aggiungi Canale
                            </button>
                        </div>
                    )}
                    {activeTab === 'bulk' && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">
                                    Incolla URL di canali YouTube (uno per riga, separati da virgola o punto e virgola):
                                </p>
                                <p className="text-xs text-gray-500 mb-2">
                                    Supporta: youtube.com/@handle, youtube.com/channel/ID, youtu.be/links
                                </p>
                            </div>
                            <textarea
                                value={bulkInput}
                                onChange={e => setBulkInput(e.target.value)}
                                placeholder={`https://www.youtube.com/@channel1\nhttps://www.youtube.com/@channel2\nhttps://www.youtube.com/channel/UCxxxxx`}
                                rows={6}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500 resize-none font-mono text-sm"
                            />
                            <button
                                onClick={handleBulkImport}
                                disabled={bulkImporting || !bulkInput.trim() || !groupName}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {bulkImporting ? (
                                    <>
                                        <span className="material-symbols-rounded animate-spin">progress_activity</span>
                                        Importazione...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded">playlist_add</span>
                                        Importa Canali
                                    </>
                                )}
                            </button>

                            {bulkResults.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Risultati: {bulkResults.filter(r => r.status === 'success').length}/{bulkResults.length} completati
                                    </p>
                                    <div className="max-h-48 overflow-auto space-y-1">
                                        {bulkResults.map((result, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-2 rounded text-xs ${
                                                result.status === 'success' ? 'bg-emerald-900/20 text-emerald-400' :
                                                result.status === 'error' ? 'bg-red-900/20 text-red-400' :
                                                'bg-slate-800/50 text-gray-500'
                                            }`}>
                                                <span className="material-symbols-rounded text-[14px]">
                                                    {result.status === 'success' ? 'check_circle' :
                                                     result.status === 'error' ? 'error' :
                                                     'hourglass_top'}
                                                </span>
                                                <span className="flex-1 truncate" title={result.url}>{result.url}</span>
                                                {result.message && <span className="text-[10px]">{result.message}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};