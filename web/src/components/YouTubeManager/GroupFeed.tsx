import React from 'react';
import type { NewsItem, SavedNewsItem } from '../../lib/utils';
import { useGroupFeedData } from './hooks/useGroupFeedData';
import { useGroupFeedModals } from './hooks/useGroupFeedModals';
import { GroupFeedTagManager } from './components/groups/GroupFeedTagManager';
import { GroupFeedVideoList } from './components/groups/GroupFeedVideoList';
import { GroupFeedCompetitors } from './components/groups/GroupFeedCompetitors';
import { GroupFeedTrendingNews } from './components/groups/GroupFeedTrendingNews';
import { GroupFeedMacroNews } from './components/groups/GroupFeedMacroNews';
import { GroupFeedNewsList } from './components/groups/GroupFeedNewsList';
import { GroupFeedNewsModal } from './components/groups/GroupFeedNewsModal';
import { GroupFeedSavedNewsModal } from './components/groups/GroupFeedSavedNewsModal';
import { GroupFeedVideoModal } from './components/groups/GroupFeedVideoModal';
import { GroupFeedSimilarVideosModal } from './components/groups/GroupFeedSimilarVideosModal';

interface GroupFeedProps {
    groupName: string;
    dateFilter: string;
    channels?: unknown[];
}

export const GroupFeed: React.FC<GroupFeedProps> = ({ groupName, dateFilter, channels = [] }) => {
    const {
        isLoading,
        feed,
        competitorFeed,
        news,
        setNews,
        competitors,
        nicheTags,
        setNicheTags,
        macroNews,
        trendingNews,
        trendingNewsLoading,
        saveTags,
        clearNewsCache,
    } = useGroupFeedData(groupName, dateFilter, channels);

    const modals = useGroupFeedModals(groupName);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full py-8 text-gray-500">
                <span className="material-symbols-rounded animate-spin mr-2">progress_activity</span>
                Loading...
            </div>
        );
    }

    const explosiveVideos = feed
        .filter(v => v.velocity && v.velocity > 1500 && v.days_old !== undefined && v.days_old <= 3)
        .sort((a, b) => (b.velocity || 0) - (a.velocity || 0));

    const handleTagsChange = (tags: string[]) => {
        setNicheTags(tags);
        saveTags(tags);
    };

    const handleRefreshNews = () => {
        clearNewsCache();
        setNews([]);
    };

    const handleOpenSaved = (saved: SavedNewsItem) => {
        const newsItem = news.find(n => n.url === saved.url) ?? { title: saved.title, url: saved.url, source: 'Saved' };
        modals.setShowSavedNewsModal(false);
        modals.openNewsModal(newsItem);
    };

    const similarButton = (
        <button
            onClick={() => modals.openSimilarVideosModal(nicheTags.slice(0, 3).join(' '))}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-medium transition-all"
        >
            <span className="material-symbols-rounded text-[14px]">add</span>
            Simili
        </button>
    );

    return (
        <div className="mt-6 space-y-6 border-t border-white/5 pt-6">
            <GroupFeedTagManager nicheTags={nicheTags} onTagsChange={handleTagsChange} />

            {explosiveVideos.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
                    <GroupFeedVideoList
                        title={
                            <span className="text-sm font-bold text-orange-500 flex items-center gap-2">
                                <span className="material-symbols-rounded text-[18px]">rocket_launch</span>
                                Video Esplosivi
                            </span>
                        }
                        videos={explosiveVideos}
                        groupName={groupName}
                        isExplosive
                        onOpenVideo={modals.openVideoModal}
                    />
                </div>
            )}

            <GroupFeedCompetitors competitors={competitors} groupName={groupName} />

            {feed.length > 0 && (
                <GroupFeedVideoList
                    title={
                        <span className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                            <span className="material-symbols-rounded text-[16px] text-red-500">video_library</span>
                            Video Trend
                        </span>
                    }
                    videos={feed}
                    groupName={groupName}
                    onOpenVideo={modals.openVideoModal}
                    headerRight={similarButton}
                />
            )}

            {competitorFeed.length > 0 && (
                <GroupFeedVideoList
                    title={
                        <span className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                            <span className="material-symbols-rounded text-[16px] text-orange-500">whatshot</span>
                            Video Competitor ({nicheTags.slice(0, 3).join(', ')})
                        </span>
                    }
                    videos={competitorFeed}
                    groupName={groupName}
                    onOpenVideo={modals.openVideoModal}
                />
            )}

            <GroupFeedTrendingNews items={trendingNews} loading={trendingNewsLoading} />

            {(macroNews.length > 0 || news.length > 0) && (
                <div className="pt-4 border-t border-[#222]">
                    {macroNews.length > 0 && (
                        <GroupFeedMacroNews items={macroNews} groupName={groupName} onInspect={modals.openNewsModal} />
                    )}
                    {news.length > 0 && (
                        <GroupFeedNewsList
                            items={news}
                            tags={nicheTags}
                            onRefresh={handleRefreshNews}
                            onOpenSaved={() => modals.setShowSavedNewsModal(true)}
                            onInspect={modals.openNewsModal}
                        />
                    )}
                </div>
            )}

            {feed.length === 0 && news.length === 0 && competitorFeed.length === 0 && (
                <div className="text-center py-6 text-gray-500">Nessun dato per questo periodo.</div>
            )}

            {modals.selectedNews && (
                <GroupFeedNewsModal
                    news={modals.selectedNews}
                    content={modals.modalContent}
                    loading={modals.modalLoading}
                    youtubeVideos={modals.modalYoutube}
                    notes={modals.modalNotes}
                    status={modals.modalStatus}
                    onClose={() => modals.setSelectedNews(null)}
                    onStatusChange={modals.handleModalStatusChange}
                    onNoteChange={modals.handleModalNoteChange}
                />
            )}

            {modals.showSavedNewsModal && (
                <GroupFeedSavedNewsModal
                    selectedUrls={modals.selectedUrls}
                    onClose={() => { modals.setShowSavedNewsModal(false); modals.setSelectedUrls(new Set()); }}
                    onToggleSelect={modals.toggleSelect}
                    onToggleSelectAll={modals.toggleSelectAll}
                    onBulkChangeStatus={modals.bulkChangeStatus}
                    onBulkDelete={modals.bulkDelete}
                    onOpenNews={handleOpenSaved}
                />
            )}

            {modals.selectedVideo && (
                <GroupFeedVideoModal
                    video={modals.selectedVideo}
                    related={modals.videoModalRelated}
                    loading={modals.videoModalLoading}
                    groupName={groupName}
                    onClose={() => modals.setSelectedVideo(null)}
                />
            )}

            {modals.similarVideosModal && (
                <GroupFeedSimilarVideosModal
                    videos={modals.similarVideos}
                    loading={modals.similarVideosLoading}
                    groupName={groupName}
                    onClose={() => modals.setSimilarVideosModal(false)}
                />
            )}
        </div>
    );
};
