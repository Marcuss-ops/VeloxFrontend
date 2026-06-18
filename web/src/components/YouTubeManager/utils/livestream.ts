export type LatencyPreference = 'normal' | 'low' | 'ultraLow';
export type StreamProtocol = 'rtmp' | 'hls';
export type TabType = 'all_streams' | 'stream_designer';

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

export const defaultStreamConfig: StreamConfig = {
    name: '',
    platform: 'youtube',
    streamKey: '',
    streamUrl: '',
    description: '',
    isForKids: false,
    videoBitrate: 8000,
    audioBitrate: 128,
    streamType: 'video',
    videoOrder: 'loop',
    scheduleStart: false,
    scheduleEnd: false,
    protocol: 'rtmp',
    autoStart: false,
    autoStop: true,
};

export interface LoadingState {
    isLoading: boolean;
    error?: string;
}

export const BUILD_INFRASTRUCTURE_CHECKLIST = 'RemoteCodex/DEPLOY_WORKER_CHECKLIST.md';
