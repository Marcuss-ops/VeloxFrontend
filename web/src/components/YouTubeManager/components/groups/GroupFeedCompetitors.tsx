import React from 'react';
import { resolveChannelLink } from '../../../../lib/utils';

interface Competitor {
    thumbnail?: string;
    channel?: string;
    title?: string;
    [key: string]: unknown;
}

interface GroupFeedCompetitorsProps {
    competitors: Competitor[];
    groupName: string;
}

export const GroupFeedCompetitors: React.FC<GroupFeedCompetitorsProps> = ({ competitors, groupName }) => {
    if (!competitors.length) return null;

    return (
        <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-[16px] text-purple-400">group_add</span>
                Canali Simili
            </h4>
            <div className="flex overflow-x-auto gap-3">
                {competitors.map((ch, idx) => (
                    <div key={idx} className="min-w-[200px] bg-[#1a1a1a] p-3 rounded-lg border border-border-dark flex items-center gap-3 group/comp relative">
                        {ch.thumbnail ? <img src={ch.thumbnail} className="w-10 h-10 rounded-full" alt="" /> : <div className="w-10 h-10 rounded-full bg-[#333]" />}
                        <div>
                            <h5 className="text-sm font-bold truncate text-white">{ch.channel || ch.title}</h5>
                            <a href={resolveChannelLink(ch as Record<string, unknown>) || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">Vedi</a>
                        </div>
                        <button
                            onClick={() => (window as unknown as { openQuickAddChannelModal?: (group: string, link?: string) => void }).openQuickAddChannelModal?.(groupName, resolveChannelLink(ch as Record<string, unknown>))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-full opacity-0 group-hover/comp:opacity-100 transition-all"
                        >
                            <span className="material-symbols-rounded text-[18px]">add</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
