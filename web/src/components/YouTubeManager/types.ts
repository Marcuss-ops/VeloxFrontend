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

// Types for Livestream feature
export type LatencyPreference = 'normal' | 'low' | 'ultraLow';
export type StreamProtocol = 'rtmp' | 'hls';

export interface StreamConfig {
    name: string;
    platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
    streamKey: string;
    streamUrl: string;
    description: string;
    isForKids: boolean;
    videoBitrate: number;
    audioBitrate: number;
    streamType: 'video';
    videoOrder: 'loop' | 'shuffle';
    scheduleStart: boolean;
    scheduleEnd: boolean;
    protocol: StreamProtocol;
    autoStart: boolean;
    autoStop: boolean;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
}

export interface LoadingState {
    isLoading: boolean;
    error?: string;
}

export type TabType = 'all_streams' | 'stream_designer';
