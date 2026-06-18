import React from 'react';
import { motion } from 'motion/react';
import { Channel } from '../../types';
import { LanguageDropdown } from './LanguageDropdown';
import { getLanguageEmoji } from '../../constants';

export interface ChannelItemProps {
    channel: Channel;
    groupName: string;
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
        case 'error': return 'bg-red-500 shadow-red-500/30';
        case 'expiring': return 'bg-amber-500 shadow-amber-500/30';
        case 'quota_exceeded': return 'bg-orange-500 shadow-orange-500/30';
        default: return 'bg-emerald-500 shadow-emerald-500/30';
    }
};

const statusLabel = (status?: string): string => {
    switch (status) {
        case 'expired': return 'Token scaduto';
        case 'error': return 'Errore';
        case 'expiring': return 'In scadenza';
        case 'quota_exceeded': return 'Quota esaurita';
        case 'valid': return 'Attivo';
        default: return '';
    }
};

export const ChannelItem: React.FC<ChannelItemProps> = ({
    channel, groupName, onReconnect, onSaveLanguage, onDelete, onDragStart, onDragEnd, isDragging, isSelected, onToggleSelect
}) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', channel.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(channel, groupName);
    };

    const handleDragEnd = () => {
        onDragEnd();
    };

    const initials = (channel.title || channel.name || '?').charAt(0).toUpperCase();
    const isExpired = channel.tokenStatus === 'expired' || channel.tokenStatus === 'error';
    const statusText = statusLabel(channel.tokenStatus);

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-grab active:cursor-grabbing group
                ${isDragging ? 'opacity-40 scale-[0.97]' : ''}
                ${isSelected
                    ? 'bg-blue-500/10 ring-1 ring-blue-500/20'
                    : 'hover:bg-white/[0.03]'
                }
            `}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Checkbox */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(channel.id); }}
                    className={`w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-[1.5px] border-white/[0.12] hover:border-white/[0.25]'
                    }`}
                >
                    {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-xl overflow-hidden ${
                        isExpired ? 'ring-1 ring-red-500/20' : 'ring-1 ring-white/[0.06]'
                    }`}>
                        {channel.thumbnail ? (
                            <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                                isExpired ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.04] text-gray-500'
                            }`}>
                                {initials}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium truncate ${isExpired ? 'text-gray-300' : 'text-gray-100'}`}>
                            {channel.title || channel.name || 'Unknown'}
                        </span>
                    </div>
                    {statusText && (
                        <span className={`text-[10px] font-medium ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                            {statusText}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                {/* Status dot */}
                <span className={`w-[6px] h-[6px] rounded-full ${statusColor(channel.tokenStatus)} shadow-sm`} />

                {/* Language */}
                <LanguageDropdown
                    channel={channel}
                    groupName={groupName}
                    onSave={(channelId, language) => onSaveLanguage(channelId, language, groupName)}
                />

                {/* Reconnect */}
                {isExpired && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onReconnect(channel); }}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Riconnetti"
                    >
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}

                {/* Delete */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(channel, groupName); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Elimina canale"
                >
                    <svg className="w-3.5 h-3.5 text-red-400 hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};