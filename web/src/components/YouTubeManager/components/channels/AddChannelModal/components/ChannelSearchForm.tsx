import React from 'react';
import { ChannelSearchResult, ChannelVideo } from '../hooks/useAddChannel';
import { ChannelPreview } from './ChannelPreview';

export interface ChannelSearchFormProps {
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    searchResults: ChannelSearchResult[];
    isSearching: boolean;
    expandedChannel: string | null;
    channelVideos: Record<string, ChannelVideo[]>;
    loadingVideos: string | null;
    onSearch: () => Promise<void>;
    onToggleExpand: (channelName: string, channelUrl?: string) => void;
    onAddChannel: (channel: ChannelSearchResult) => void;
}

export const ChannelSearchForm: React.FC<ChannelSearchFormProps> = ({
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    expandedChannel,
    channelVideos,
    loadingVideos,
    onSearch,
    onToggleExpand,
    onAddChannel,
}) => {
    return (
        <>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onSearch()}
                    placeholder="Cerca canale..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                />
                <button
                    onClick={onSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                >
                    {isSearching ? (
                        <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-rounded">search</span>
                    )}
                </button>
            </div>

            <div className="space-y-2">
                {searchResults.map((channel, idx) => {
                    const channelKey = String(channel.channel || channel.title || idx);
                    const isExpanded = expandedChannel === channelKey;
                    const videos = channelVideos[channelKey] || [];
                    const isLoadingVids = loadingVideos === channelKey;

                    return (
                        <ChannelPreview
                            key={idx}
                            channel={channel}
                            isExpanded={isExpanded}
                            videos={videos}
                            isLoadingVids={isLoadingVids}
                            onToggleExpand={() => onToggleExpand(channelKey, channel.url || channel.channel_url)}
                            onAddChannel={() => onAddChannel(channel)}
                        />
                    );
                })}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-500">
                        <span className="material-symbols-rounded text-4xl mb-2">search_off</span>
                        <p>Nessun canale trovato</p>
                    </div>
                )}
            </div>
        </>
    );
};