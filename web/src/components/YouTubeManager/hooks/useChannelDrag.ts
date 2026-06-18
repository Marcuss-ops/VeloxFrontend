import { useState, useCallback } from 'react';
import { youtubeApi } from '@/lib/api';
import type { Channel } from '../types';

export interface UseChannelDragResult {
    draggingChannel: Channel | null;
    dragSourceGroup: string | null;
    handleDragStart: (channel: Channel, sourceGroup: string) => void;
    handleDragEnd: () => void;
    handleDrop: (
        targetGroupName: string,
        loadData: () => Promise<void>,
    ) => Promise<void>;
}

export const useChannelDrag = (): UseChannelDragResult => {
    const [draggingChannel, setDraggingChannel] = useState<Channel | null>(null);
    const [dragSourceGroup, setDragSourceGroup] = useState<string | null>(null);

    const handleDragStart = useCallback((channel: Channel, sourceGroup: string) => {
        setDraggingChannel(channel);
        setDragSourceGroup(sourceGroup);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggingChannel(null);
        setDragSourceGroup(null);
    }, []);

    const handleDrop = useCallback(async (
        targetGroupName: string,
        loadData: () => Promise<void>,
    ) => {
        if (!draggingChannel || !dragSourceGroup) return;
        if (dragSourceGroup === targetGroupName) {
            setDraggingChannel(null);
            setDragSourceGroup(null);
            return;
        }

        try {
            await youtubeApi.moveChannel(draggingChannel.id, targetGroupName);
        } catch (err) {
            console.error('Failed to move channel:', err);
        }

        // Always reload from DB to ensure consistency
        await loadData();

        setDraggingChannel(null);
        setDragSourceGroup(null);
    }, [draggingChannel, dragSourceGroup]);

    return {
        draggingChannel,
        dragSourceGroup,
        handleDragStart,
        handleDragEnd,
        handleDrop,
    };
};
