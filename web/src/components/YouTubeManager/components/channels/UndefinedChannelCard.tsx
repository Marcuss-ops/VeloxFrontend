import React from 'react';
import { Channel } from '../../types';
import { LanguageDropdown } from './LanguageDropdown';
import { getLanguageEmoji } from '../../constants';

export interface UndefinedChannelCardProps {
    channel: Channel;
    onReconnect: (channel: Channel) => void;
    onSaveLanguage: (channelId: string, language: string, groupName: string) => void;
    onDelete: (channel: Channel, groupName: string) => void;
    onDragStart: (channel: Channel, groupName: string) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    isSelected: boolean;
    onToggleSelect: (channelId: string) => void;
}

const statusColor = (status?: string) => {
    switch (status) {
        case 'expired':
        case 'error': return 'bg-red-500';
        case 'expiring': return 'bg-amber-500 animate-pulse';
        case 'quota_exceeded': return 'bg-orange-500';
        default: return 'bg-emerald-500';
    }
};

export const UndefinedChannelCard: React.FC<UndefinedChannelCardProps> = ({
    channel, onReconnect, onSaveLanguage, onDelete, onDragStart, onDragEnd, isDragging, isSelected, onToggleSelect
}) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', channel.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(channel, 'Undefined');
    };

    const handleDragEnd = () => {
        onDragEnd();
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-[#1C1C1E] rounded-xl p-3 border transition-all group cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-50 border-blue-500/50 ring-2 ring-blue-500/20' : 'border-gray-800 hover:border-gray-700'
            } ${isSelected ? 'ring-1 ring-blue-500/30 bg-blue-500/10' : ''}`}
        >
            <div className="flex items-center gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(channel.id); }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-2 border-gray-600 hover:border-gray-500'
                    }`}
                >
                    {isSelected && (
                        <span className="material-icons text-white text-sm">check</span>
                    )}
                </button>

                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    {channel.thumbnail ? (
                        <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                            {(channel.title || channel.name || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-100 truncate">{channel.title || channel.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor(channel.tokenStatus)}`} />
                        <span className="text-xs text-gray-500">{channel.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <LanguageDropdown
                        channel={channel}
                        groupName="Undefined"
                        onSave={(channelId, language) => onSaveLanguage(channelId, language, 'Undefined')}
                    />

                    {(channel.tokenStatus === 'expired' || channel.tokenStatus === 'error') && (
                        <button
                            onClick={() => onReconnect(channel)}
                            className="p-1.5 rounded-lg hover:bg-white/10"
                            title="Riconnetti"
                        >
                            <span className="material-icons text-base text-amber-400">sync</span>
                        </button>
                    )}

                    <button
                        onClick={() => onDelete(channel, 'Undefined')}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        title="Elimina canale"
                    >
                        <span className="material-icons text-base text-red-400 hover:text-red-300">delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
