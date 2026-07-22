export interface DailyStat {
    date: string;
    revenue: number;
    views: number;
}

export interface ChannelStats {
    name: string;
    thumbnail_url?: string;
    revenue: number;
    views: number;
    subscribers?: number;
    minutes_watched?: number;
    auth_error?: boolean;
}

export interface FinanceData {
    period: string;
    totals: {
        revenue: number;
        views: number;
    };
    mom?: {
        current_month_revenue: number;
        prev_month_revenue: number;
        revenue_growth: number;
        current_month_views: number;
        prev_month_views: number;
        views_growth: number;
    };
    channels: ChannelStats[];
    daily_stats: DailyStat[];
}

