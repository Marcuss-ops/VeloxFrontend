import React, { useState, useEffect, useCallback } from 'react';
import { PanoramaStats } from './PanoramaStats';
import { PanoramaTopVideos } from './PanoramaTopVideos';
import { PanoramaCompletedJobs } from './PanoramaCompletedJobs';
import { PanoramaToPost } from './PanoramaToPost';

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

interface RawVideoData {
    video_id?: string;
    id?: string;
    title?: string;
    video_name?: string;
    thumbnail_url?: string;
    thumbnail?: string;
    views?: number | string;
    revenue?: number | string;
    channel_name?: string;
    channel?: string;
    published_at?: string;
    published?: string;
    velocity?: number | string;
}

interface RawJobData {
    job_id?: string;
    id?: string;
    video_name?: string;
    name?: string;
    title?: string;
    video_title?: string;
    slot_data?: {
        video_name?: string;
        title?: string;
    };
    status?: string;
    completed_at?: string;
    updated_at?: string;
    created_at?: string;
    assigned_to?: string;
    worker_id?: string;
    thumbnail_url?: string;
    thumbnail?: string;
    drive_link?: string;
    last_drive_upload_result?: {
        link?: string;
    };
    posted?: boolean;
}

// Skeleton components
const StatSkeleton: React.FC = () => (
    <div className="rounded-2xl border border-white/5 bg-surface/50 p-5 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-white/5" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="h-6 w-32 bg-white/5 rounded" />
            </div>
        </div>
    </div>
);

const VideoRowSkeleton: React.FC = () => (
    <div className="flex items-center gap-4 py-3 animate-pulse">
        <div className="size-16 rounded-lg bg-white/5 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-white/5 rounded" />
            <div className="h-3 w-1/3 bg-white/5 rounded" />
        </div>
        <div className="h-5 w-20 bg-white/5 rounded" />
    </div>
);

export const PanoramaApp: React.FC = () => {
    const [data, setData] = useState<PanoramaData>({
        top_videos: [],
        views48h: 0,
        revenue48h: 0,
        completed_jobs_24h: [],
        to_post: [],
        loading: true,
        error: null,
    });

    const fetchData = useCallback(async () => {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const [financeRes, performanceRes] = await Promise.all([
                fetch('/api/v1/dashboard/finance?period=2'),
                fetch('/api/v1/dashboard/performance?limit=20'),
            ]);

            let views48h = 0;
            let revenue48h = 0;
            if (financeRes.ok) {
                const finance = await financeRes.json();
                views48h = Number(finance?.summary?.total_views || finance?.summary?.views || 0);
                revenue48h = Number(finance?.summary?.total_revenue || finance?.summary?.revenue || 0);
            }

            let topVideos: TopVideo[] = [];
            if (performanceRes.ok) {
                const performance = await performanceRes.json();
                const items = Array.isArray(performance?.top_videos?.items)
                    ? performance.top_videos.items
                    : [];
                topVideos = items.map((v: any) => ({
                    video_id: String(v?.video_id || v?.id || ''),
                    title: String(v?.title || v?.video_name || 'Untitled'),
                    thumbnail_url: v?.thumbnail_url || v?.thumbnail,
                    views: Number(v?.views_30d || v?.views || v?.views30d || 0),
                    revenue: Number(v?.revenue || 0),
                    channel_name: v?.channel_title || v?.channel_name,
                    published_at: v?.published_at || v?.published,
                    velocity: Number(v?.velocity || 0),
                })).filter((v: TopVideo) => v.video_id || v.title !== 'Untitled');
            }

            // Fetch completed jobs (last 24h)
            let completedJobs: CompletedJob[] = [];
            try {
                const jobsRes = await fetch('/api/v1/jobs?status=COMPLETED');
                if (jobsRes.ok) {
                    const jobsPayload = await jobsRes.json();
                    // Handle various response structures
                    const jobsArray = Array.isArray(jobsPayload) 
                        ? jobsPayload 
                        : Array.isArray(jobsPayload?.jobs) 
                            ? jobsPayload.jobs 
                            : [];
                    completedJobs = jobsArray.map((j: RawJobData) => ({
                        job_id: j.job_id || j.id || '',
                        video_name: j.video_name || j.name || j.title || j.video_title || (j.slot_data?.video_name ?? j.slot_data?.title) || 'Untitled',
                        status: j.status,
                        completed_at: j.completed_at || j.updated_at,
                        created_at: j.created_at,
                        assigned_to: j.assigned_to || j.worker_id,
                        thumbnail_url: j.thumbnail_url || j.thumbnail,
                        drive_link: j.drive_link || j.last_drive_upload_result?.link,
                        posted: Boolean(j.last_drive_upload_result || j.posted),
                    }));
                }
            } catch (e) {
                console.warn('Failed to fetch completed jobs:', e);
            }

            // Filter to-post: completed but not yet posted (no drive link)
            const toPost = completedJobs.filter(j => !j.drive_link && !j.posted);

            setData({
                top_videos: topVideos,
                views48h: views48h,
                revenue48h: revenue48h,
                completed_jobs_24h: completedJobs,
                to_post: toPost,
                loading: false,
                error: null,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load panorama data';
            setData(prev => ({ ...prev, loading: false, error: msg }));
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Refresh every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (data.loading && data.top_videos.length === 0) {
        return (
            <div className="space-y-8 p-6">
                {/* Stats skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => <StatSkeleton key={i} />)}
                </div>
                {/* Top videos skeleton */}
                <div className="rounded-2xl border border-white/5 bg-surface/50 p-6">
                    <div className="h-5 w-40 bg-white/5 rounded mb-4 animate-pulse" />
                    {[0, 1, 2, 3, 4].map(i => <VideoRowSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
            {/* Error banner */}
            {data.error && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    {data.error}
                </div>
            )}

            {/* Stats cards */}
            <PanoramaStats
                views48h={data.views48h}
                revenue48h={data.revenue48h}
                completedCount={data.completed_jobs_24h.length}
                toPostCount={data.to_post.length}
            />

            {/* Top videos section */}
            <PanoramaTopVideos videos={data.top_videos} />

            {/* Two column layout for completed and to-post */}
            <div className="grid lg:grid-cols-2 gap-6">
                <PanoramaCompletedJobs jobs={data.completed_jobs_24h} />
                <PanoramaToPost jobs={data.to_post} />
            </div>
        </div>
    );
};
