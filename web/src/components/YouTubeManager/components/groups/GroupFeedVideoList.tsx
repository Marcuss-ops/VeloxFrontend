import React from 'react';
import type { FeedItem } from '../../../../lib/utils';
import { GroupFeedVideoCard } from './GroupFeedVideoCard';

interface GroupFeedVideoListProps {
    title: React.ReactNode;
    videos: FeedItem[];
    groupName: string;
    isExplosive?: boolean;
    onOpenVideo: (video: FeedItem) => void;
    headerRight?: React.ReactNode;
}

export const GroupFeedVideoList: React.FC<GroupFeedVideoListProps> = ({
    title,
    videos,
    groupName,
    isExplosive = false,
    onOpenVideo,
    headerRight,
}) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">{title}</h4>
                {headerRight}
            </div>
            <div className="flex overflow-x-auto gap-4">
                {videos.map((v, i) => (
                    <GroupFeedVideoCard key={i} video={v} isExplosive={isExplosive} groupName={groupName} onOpen={onOpenVideo} />
                ))}
            </div>
        </div>
    );
};
