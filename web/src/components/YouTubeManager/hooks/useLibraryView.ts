import { useState, useEffect, useCallback } from 'react';
import { youtubeApi } from '../../../lib/api';
import { Channel, Group, SuggestedChannel } from '../utils/libraryView';
import { normalizeManagerGroups } from '../utils/managerGroups';

export interface UseLibraryViewReturn {
    groups: Record<string, Group>;
    isLoading: boolean;
    dateFilter: string;
    expandedGroups: Record<string, boolean>;
    suggestedChannels: Record<string, SuggestedChannel[]>;
    selectedChannels: Set<string>;
    selectionMode: boolean;
    showMoveModal: boolean;
    moveTargetGroup: string;
    draggedChannel: { channel: Channel; sourceGroup: string } | null;
    dropTarget: string | null;
    allGroupNames: string[];
    toggleGroup: (groupName: string) => void;
    fetchGroups: () => Promise<void>;
    toggleChannelSelection: (channelId: string) => void;
    selectAllInGroup: (groupName: string, channels: Channel[]) => void;
    deselectAll: () => void;
    deleteSelectedChannels: () => Promise<void>;
    moveSelectedChannels: (targetGroup: string) => Promise<void>;
    handleDragStart: (e: React.DragEvent, channel: Channel, sourceGroup: string) => void;
    handleDragOver: (e: React.DragEvent, groupName: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, targetGroup: string) => Promise<void>;
    handleDeleteGroup: (groupName: string) => Promise<void>;
    setDateFilter: React.Dispatch<React.SetStateAction<string>>;
    setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
    setShowMoveModal: React.Dispatch<React.SetStateAction<boolean>>;
    setMoveTargetGroup: React.Dispatch<React.SetStateAction<string>>;
}

export function useLibraryView(): UseLibraryViewReturn {
    const [groups, setGroups] = useState<Record<string, Group>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('week');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [suggestedChannels, setSuggestedChannels] = useState<Record<string, SuggestedChannel[]>>({});

    // Bulk selection state
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveTargetGroup, setMoveTargetGroup] = useState<string>('');

    // Drag state
    const [draggedChannel, setDraggedChannel] = useState<{ channel: Channel, sourceGroup: string } | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    const toggleGroup = useCallback((groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    }, []);

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const data: any = await youtubeApi.managerGroups();
            if (data.ok || data.groups) {
                const normalized = normalizeManagerGroups(data.groups);
                const asRecord = Object.fromEntries(
                    normalized.map(group => [
                        String(group.name || '').trim(),
                        {
                            name: String(group.name || '').trim(),
                            channels: (group.channels || []).map(ch => ({
                                id: ch.id,
                                url: `https://www.youtube.com/channel/${ch.id}`,
                                title: ch.title || ch.name || ch.id,
                                name: ch.name || ch.title || ch.id,
                                thumbnail: ch.thumbnail,
                            })),
                        } satisfies Group,
                    ] as const)
                );
                setGroups(asRecord);
                (window as any).groupsData = asRecord;

                // Fetch suggestions for empty groups
                const emptyGroups = Object.entries(asRecord)
                    .filter(([_, group]: [string, any]) => !group.channels || group.channels.length === 0)
                    .map(([name, _]) => name);

                if (emptyGroups.length > 0) {
                    try {
                        const suggestions: any = await youtubeApi.similarAuto(10, 500);
                        if (suggestions.ok && suggestions.channels) {
                            const suggestionMap: Record<string, SuggestedChannel[]> = {};
                            for (const groupName of emptyGroups) {
                                suggestionMap[groupName] = suggestions.channels.slice(0, 5);
                            }
                            setSuggestedChannels(suggestionMap);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch suggestions:', e);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load manager groups:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // Selection handlers
    const toggleChannelSelection = useCallback((channelId: string) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
    }, []);

    const selectAllInGroup = useCallback((groupName: string, channels: Channel[]) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            channels.forEach(ch => newSet.add(`${groupName}:${ch.id}`));
            return newSet;
        });
    }, []);

    const deselectAll = useCallback(() => setSelectedChannels(new Set()), []);

    const deleteSelectedChannels = useCallback(async () => {
        if (selectedChannels.size === 0) return;
        if (!window.confirm(`Eliminare ${selectedChannels.size} canali selezionati?`)) return;

        const deletions = Array.from(selectedChannels).map(key => {
            const [groupName, channelId] = key.split(':');
            return youtubeApi.removeChannelFromManagerGroup(groupName, channelId);
        });

        await Promise.all(deletions);
        setSelectedChannels(new Set());
        fetchGroups();
    }, [selectedChannels, fetchGroups]);

    const moveSelectedChannels = useCallback(async (targetGroup: string) => {
        if (selectedChannels.size === 0 || !targetGroup) return;

        const moves = Array.from(selectedChannels).map(async key => {
            const [sourceGroup, channelId] = key.split(':');
            const sourceChannels = groups[sourceGroup]?.channels || [];
            const channel = sourceChannels.find(ch => ch.id === channelId);

            if (!channel) return;

            // Add to target group
            await youtubeApi.addChannelToManagerGroup(targetGroup, channel.id, {
                url: channel.url,
                title: channel.title,
                thumbnail: channel.thumbnail
            });

            // Remove from source group
            await youtubeApi.removeChannelFromManagerGroup(sourceGroup, channelId);
        });

        await Promise.all(moves);
        setSelectedChannels(new Set());
        setShowMoveModal(false);
        fetchGroups();
    }, [selectedChannels, groups, fetchGroups]);

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, channel: Channel, sourceGroup: string) => {
        setDraggedChannel({ channel, sourceGroup });
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, groupName: string) => {
        e.preventDefault();
        setDropTarget(groupName);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, targetGroup: string) => {
        e.preventDefault();
        setDropTarget(null);

        if (!draggedChannel || draggedChannel.sourceGroup === targetGroup) {
            setDraggedChannel(null);
            return;
        }

        const { channel, sourceGroup } = draggedChannel;

        // Add to target group
        await youtubeApi.addChannelToManagerGroup(targetGroup, channel.id, {
            url: channel.url,
            title: channel.title,
            thumbnail: channel.thumbnail
        });

        // Remove from source group
        await youtubeApi.removeChannelFromManagerGroup(sourceGroup, channel.id);

        setDraggedChannel(null);
        fetchGroups();
    }, [draggedChannel, fetchGroups]);

    const handleDeleteGroup = useCallback(async (groupName: string) => {
        if (!window.confirm(`Are you sure you want to delete the group '${groupName}'?`)) return;

        try {
            await youtubeApi.deleteManagerGroup(groupName);
            fetchGroups();
        } catch (e) {
            console.error("Failed to delete manager group", e);
        }
    }, [fetchGroups]);

    const allGroupNames = Object.keys(groups);

    return {
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
        setDateFilter,
        setSelectionMode,
        setShowMoveModal,
        setMoveTargetGroup,
    };
}
