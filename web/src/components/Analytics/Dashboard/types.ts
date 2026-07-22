// Types for the Dashboard analytics module

// Main view tabs - unified Panoramica with Revenue/Views integration
export type PanoramicaTab = 'panoramica' | 'dati';

// Sub-tabs for the Panoramica/Dashboard section
export type DashboardTab = 'coda' | 'esecuzione' | 'completati' | 'errori' | 'api' | 'analytics';

// Analytics data types
export interface AnalyticsTimelinePoint {
    date: string;
    views: number;
    revenue: number;
    cumulative?: number;
}

export interface AnalyticsSummary {
    total_views: number;
    total_revenue: number;
    total_videos: number;
    avg_views?: number;
}

export interface TopVideo {
    video_id?: string;
    title?: string;
    thumbnail_url?: string;
    views_24h: number;
    views_7d: number;
    views_30d: number;
}

export interface TopChannel {
    channel_id?: string;
    channel_title: string;
    total_views: number;
    total_revenue?: number;
    thumbnail_url?: string;
}

// Finance sub-tabs
export type FinanceTab = 'revenue' | 'views';

export interface DashboardCounts {
    coda: number;
    esecuzione: number;
    errori: number;
}

export interface ApiSubmission {
    job_id?: string;
    created_at?: string;
    project_name?: string;
    youtube_group?: string;
    video_name?: string;
    video_style?: string;
    client_ip?: string;
    voiceovers_urls_count?: number;
    start_clips_urls_count?: number;
    stock_clips_urls_count?: number;
}

