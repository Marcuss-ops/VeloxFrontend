import { youtubeApi } from '../../../lib/api';
import { normalizeManagerGroups } from './managerGroups';

export interface Channel {
    id: string;
    url: string;
    title: string;
    thumbnail?: string;
    subscribers?: string;
    views?: string;
    notes?: string;
}

export interface Group {
    name: string;
    channels: Channel[];
}

export interface SuggestedChannel {
    title: string;
    url: string;
    thumbnail?: string;
    velocity?: number;
    viewCount?: number;
    reason?: string;
}

type ManagerGroupsResponse = {
    ok?: boolean;
    groups?: Record<string, Group> | Array<Group>;
};

function normalizeGroups(groups: ManagerGroupsResponse['groups']): Record<string, Group> {
    const normalized = normalizeManagerGroups(groups);
    return Object.fromEntries(
        normalized.map(group => [
            String(group.name || '').trim(),
            {
                name: String(group.name || '').trim(),
                channels: (group.channels || []).map(channel => ({
                    id: channel.id,
                    url: `https://www.youtube.com/channel/${channel.id}`,
                    title: channel.title || channel.name || channel.id,
                    name: channel.name || channel.title || channel.id,
                    thumbnail: channel.thumbnail,
                    subscribers: undefined,
                    views: undefined,
                    notes: undefined,
                })),
            } satisfies Group,
        ] as const)
    );
}

export async function fetchGroups(): Promise<Record<string, Group>> {
    const data: any = await youtubeApi.managerGroups();
    if (data.ok || data.groups) {
        return normalizeGroups(data.groups);
    }
    return {};
}

export async function fetchSuggestions(emptyGroups: string[]): Promise<Record<string, SuggestedChannel[]>> {
    try {
        const suggestions: any = await youtubeApi.similarAuto(10, 500);
        if (suggestions.ok && suggestions.channels) {
            const suggestionMap: Record<string, SuggestedChannel[]> = {};
            for (const groupName of emptyGroups) {
                suggestionMap[groupName] = suggestions.channels.slice(0, 5);
            }
            return suggestionMap;
        }
    } catch (e) {
        console.warn('Failed to fetch suggestions:', e);
    }
    return {};
}

export async function moveChannelToGroup(
    channel: Channel,
    sourceGroup: string,
    targetGroup: string
): Promise<void> {
    // Add to target group
    await youtubeApi.addChannelToManagerGroup(targetGroup, channel.id, {
        url: channel.url,
        title: channel.title,
        thumbnail: channel.thumbnail
    });
    // Remove from source group
    await youtubeApi.removeChannelFromManagerGroup(sourceGroup, channel.id);
}

export async function deleteSelectedChannels(selectedKeys: Set<string>, groups: Record<string, Group>, onRefresh: () => void): Promise<void> {
    if (selectedKeys.size === 0) return;
    if (!window.confirm(`Eliminare ${selectedKeys.size} canali selezionati?`)) return;

    const deletions = Array.from(selectedKeys).map(key => {
        const [groupName, channelId] = key.split(':');
        return youtubeApi.removeChannelFromManagerGroup(groupName, channelId);
    });

    await Promise.all(deletions);
    onRefresh();
}

export async function moveSelectedChannels(
    selectedKeys: Set<string>,
    targetGroup: string,
    groups: Record<string, Group>,
    onRefresh: () => void
): Promise<void> {
    if (selectedKeys.size === 0 || !targetGroup) return;

    const moves = Array.from(selectedKeys).map(async key => {
        const [sourceGroup, channelId] = key.split(':');
        const sourceChannels = groups[sourceGroup]?.channels || [];
        const channel = sourceChannels.find(ch => ch.id === channelId);
        if (!channel) return;
        await moveChannelToGroup(channel, sourceGroup, targetGroup);
    });

    await Promise.all(moves);
    onRefresh();
}
