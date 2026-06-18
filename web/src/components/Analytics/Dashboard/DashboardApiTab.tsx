import React from 'react';
import { ApiSubmission, YouTubeChannelSummary } from './types';

interface DashboardApiTabProps {
    submissions: ApiSubmission[];
    ytSummary: YouTubeChannelSummary;
    onRefresh: () => void;
}

export const DashboardApiTab: React.FC<DashboardApiTabProps> = ({ submissions, ytSummary, onRefresh }) => {
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const getInputSummary = (item: ApiSubmission) => {
        const parts = [];
        if (item.voiceovers_urls_count) parts.push(`${item.voiceovers_urls_count} VO`);
        if (item.start_clips_urls_count) parts.push(`${item.start_clips_urls_count} start`);
        if (item.stock_clips_urls_count) parts.push(`${item.stock_clips_urls_count} stock`);
        return parts.join(' • ');
    };

    const ytTotal = ytSummary.total_channels ?? 0;
    const ytTokenPresent = ytSummary.channels_token_present ?? 0;
    const ytNoToken = ytSummary.channels_no_token ?? 0;
    const ytReauth = ytSummary.channels_reauth ?? 0;
    const ytError = ytSummary.channels_error ?? 0;
    const ytOk = ytSummary.channels_ok ?? 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="text-xl font-bold text-text-primary">API Standalone</h3>
                    <p className="text-text-secondary text-sm">Ultimi job creati via <span className="font-mono text-primary">POST /api/v1/jobs</span></p>
                </div>
                <div className="flex gap-3">
                    <a className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-sm font-medium" href="/api_standalone">
                        Apri pagina dedicata
                    </a>
                    <a className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-sm font-medium" href="/api_standalone/docs">
                        Docs API
                    </a>
                    <button onClick={onRefresh} className="px-4 py-2 rounded-lg bg-[#232f48] hover:bg-[#2a3a5a] transition-colors text-sm font-medium text-text-primary">
                        Aggiorna
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                    <div className="text-text-secondary text-xs font-bold uppercase tracking-widest">API Submissions</div>
                    <div className="mt-2 flex items-baseline gap-3">
                        <div className="text-4xl font-bold text-text-primary tracking-tight">{submissions.length}</div>
                        <div className="text-text-secondary text-sm">ultimi invii</div>
                    </div>
                </div>
                <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-text-secondary text-xs font-bold uppercase tracking-widest">Video Channels</div>
                            <div className="text-text-secondary text-sm">Stato token (cache)</div>
                        </div>
                        <a className="text-primary text-xs font-semibold hover:underline bg-primary/10 px-2 py-1 rounded" href="/api/v1/youtube/channels?validate_tokens=true" title="Verifica reale (più lenta)">
                            VALIDATE=TRUE
                        </a>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                        <span className="px-2.5 py-1 rounded-full bg-[#232f48] border border-border-dark text-text-primary">
                            Tot: {ytTotal}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
                            Token: {ytTokenPresent}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300">
                            No token: {ytNoToken}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
                            Reauth: {ytReauth}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-red-900/30 border border-red-500/30 text-red-200">
                            Error: {ytError}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-300">
                            OK: {ytOk}
                        </span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border-dark bg-card-dark overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-border-dark bg-surface">
                                <th className="py-3 pr-4 pl-2 text-left font-semibold">Quando</th>
                                <th className="py-3 pr-4 text-left font-semibold">Job</th>
                                <th className="py-3 pr-4 text-left font-semibold">Progetto</th>
                                <th className="py-3 pr-4 text-left font-semibold">Gruppo</th>
                                <th className="py-3 pr-4 text-left font-semibold">Video</th>
                                <th className="py-3 pr-4 text-left font-semibold">Stile</th>
                                <th className="py-3 pr-4 text-left font-semibold">Input</th>
                                <th className="py-3 pr-4 text-left font-semibold">Client</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-text-secondary italic">
                                        Nessun invio registrato
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((item, idx) => (
                                    <tr key={item.job_id || idx} className="border-b border-border-dark group hover:bg-surface">
                                        <td className="py-3 pr-4 text-text-secondary text-xs pl-2">
                                            {formatDate(item.created_at)}
                                        </td>
                                        <td className="py-3 pr-4">
                                            {item.job_id ? (
                                                <a className="text-primary hover:underline font-mono text-xs" href={`/jobs/detail/${encodeURIComponent(item.job_id)}`}>
                                                    #{item.job_id.slice(0, 8)}
                                                </a>
                                            ) : ''}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-text-secondary">{item.project_name || ''}</td>
                                        <td className="py-3 pr-4 text-sm text-text-secondary">{item.youtube_group || ''}</td>
                                        <td className="py-3 pr-4 text-sm font-medium text-text-primary">{item.video_name || ''}</td>
                                        <td className="py-3 pr-4 text-text-secondary text-xs uppercase tracking-wider">{item.video_style || ''}</td>
                                        <td className="py-3 pr-4 text-text-secondary text-xs">{getInputSummary(item)}</td>
                                        <td className="py-3 pr-4 text-text-secondary text-xs font-mono">{item.client_ip || ''}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
