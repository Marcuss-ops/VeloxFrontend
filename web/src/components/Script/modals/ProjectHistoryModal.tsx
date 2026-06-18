import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { VideoProject } from '../types';

export interface ProjectHistoryItem {
    id: string;
    label: string;
    project: VideoProject;
    createdAt: number;
    lastUsedAt: number;
    uses: number;
}

interface ProjectHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: ProjectHistoryItem[];
    onApply: (item: ProjectHistoryItem) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}

const formatDate = (ts: number): string => {
    try {
        return new Date(ts).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
};

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({
    open,
    onOpenChange,
    items,
    onApply,
    onDelete,
    onClear,
}) => {
    const [query, setQuery] = React.useState('');

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => {
            const firstTitle = String(item.project?.titles?.find((t) => String(t || '').trim()) || '').toLowerCase();
            return (
                String(item.label || '').toLowerCase().includes(q) ||
                String(item.project?.youtubeGroup || '').toLowerCase().includes(q) ||
                String(item.project?.videoStyle || '').toLowerCase().includes(q) ||
                firstTitle.includes(q)
            );
        });
    }, [items, query]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl bg-slate-900 border-white/10 text-white shadow-2xl rounded-[32px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <span className="material-symbols-outlined text-sky-400">history</span>
                        Storico Progetti
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Carica una configurazione progetto salvata in precedenza.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 mt-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca per gruppo, stile o titolo..."
                        className="flex-1 h-10 rounded-xl bg-slate-950/70 border border-white/10 px-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-sky-500/40"
                    />
                    <button
                        type="button"
                        onClick={onClear}
                        className="h-10 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                        Svuota
                    </button>
                </div>

                <div className="mt-3 max-h-[58vh] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {filtered.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-8 border border-white/5 rounded-xl bg-slate-950/30">
                            Nessun progetto nello storico
                        </div>
                    ) : (
                        filtered.slice(0, 120).map((item) => {
                            const firstTitle = item.project?.titles?.find((t) => String(t || '').trim()) || 'Titolo non disponibile';
                            return (
                                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-slate-200 truncate">{item.label}</div>
                                        <div className="text-[11px] text-slate-500">{formatDate(item.createdAt)}</div>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Gruppo: <span className="text-slate-300">{item.project.youtubeGroup || '-'}</span>
                                        {' · '}
                                        Stile: <span className="text-slate-300">{item.project.videoStyle || '-'}</span>
                                        {' · '}
                                        Titoli: <span className="text-slate-300">{(item.project.titles || []).filter((t) => String(t || '').trim()).length}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-1">{firstTitle}</div>

                                    <div className="flex items-center gap-1.5 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => onApply(item)}
                                            className="px-3 py-1 rounded-lg bg-sky-600/20 text-sky-300 text-[11px] font-bold border border-sky-500/30 hover:bg-sky-600/30"
                                        >
                                            Carica progetto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(item.id)}
                                            className="ml-auto px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-300 text-[10px] font-bold border border-white/10 hover:border-red-500/30"
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
