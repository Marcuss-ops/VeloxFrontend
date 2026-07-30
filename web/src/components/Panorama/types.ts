export interface TopVideo {
    video_id: string;
    title: string;
    thumbnail_url?: string;
    views: number;
    revenue?: number;
    channel_name?: string;
    published_at?: string;
    velocity?: number;
}

export interface CompletedJob {
    job_id: string;
    video_name: string;
    status: string;
    completed_at?: string;
    created_at?: string;
    assigned_to?: string;
    thumbnail_url?: string;
    drive_link?: string;
    posted?: boolean;
}

export interface PanoramaData {
    top_videos: TopVideo[];
    views48h: number;
    revenue48h: number;
    completed_jobs_24h: CompletedJob[];
    to_post: CompletedJob[];
    loading: boolean;
    error: string | null;
}
