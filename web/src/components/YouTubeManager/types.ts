// Types for YouTube Channels App
import { YouTubeChannel } from '@/lib/api';

export interface Channel extends YouTubeChannel {
    language?: string;
    tokenStatus?: 'valid' | 'expired' | 'expiring' | 'error' | 'quota_exceeded';
    tokenExpiresAt?: string;
    groupName?: string;
}

export interface ChannelGroup {
    name: string;
    channels: Channel[];
}

export interface ChannelConfig {
    id: string;
    name: string;
    title?: string;
    language: string;
    group: string;
}

export interface GroupsConfig {
    [groupName: string]: {
        color?: string;
        channels: ChannelConfig[];
    };
}

export interface DriveAccount {
    name: string;
    email: string;
    expires_at: string;
    created_at: string;
}

export interface DialogState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}
