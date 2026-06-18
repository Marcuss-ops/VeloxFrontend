import React, { useState } from 'react';
import { Channel } from '../../types';
import { UndefinedChannelCard } from './UndefinedChannelCard';

export interface UndefinedChannelsSectionProps {
    channels: Channel[];
    onReconnect: (channel: Channel) => void;
    onSaveLanguage: (channelId: string, language: string, groupName: string) => void;
    onDelete: (channel: Channel, groupName: string) => void;
    onDragStart: (channel: Channel, groupName: string) => void;
    onDragEnd: () => void;
    draggingChannel: Channel | null;
    onDrop: (targetGroupName: string) => void;
    selectedChannels: Set<string>;
    onToggleSelect: (channelId: string) => void;
}

export const UndefinedChannelsSection: React.FC<UndefinedChannelsSectionProps> = ({
    channels, onReconnect, onSaveLanguage, onDelete, onDragStart, onDragEnd, draggingChannel, onDrop, selectedChannels, onToggleSelect
}) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop('Undefined');
    };

    return (
        <div className="mt-8">
            <div className="flex items-center gap-2 mb-4 px-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <h2 className="text-base font-semibold text-gray-100">Undefined</h2>
                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs font-medium text-gray-400">
                    {channels.length}
                </span>
                <span className="text-xs text-gray-600 ml-2">Canali con token ma senza gruppo</span>
            </div>

            <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl transition-all ${
                    isDragOver ? 'bg-blue-500/10 border-2 border-dashed border-blue-500' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {channels.map((channel: Channel) => (
                    <UndefinedChannelCard
                        key={channel.id}
                        channel={channel}
                        onReconnect={onReconnect}
                        onSaveLanguage={onSaveLanguage}
                        onDelete={onDelete}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        isDragging={draggingChannel?.id === channel.id}
                        isSelected={selectedChannels.has(channel.id)}
                        onToggleSelect={onToggleSelect}
                    />
                ))}
            </div>
        </div>
    );
};
