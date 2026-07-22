import React from 'react';
import { ApiSubmission } from './types';

interface DashboardApiTabProps {
    submissions: ApiSubmission[];
    onRefresh: () => void;
}

export const DashboardApiTab: React.FC<DashboardApiTabProps> = ({ submissions, onRefresh }) => {
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

            <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                    <div className="text-text-secondary text-xs font-bold uppercase tracking-widest">API Submissions</div>
                    <div className="mt-2 flex items-baseline gap-3">
                        <div className="text-4xl font-bold text-text-primary tracking-tight">{submissions.length}</div>
                        <div className="text-text-secondary text-sm">ultimi invii</div>
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
