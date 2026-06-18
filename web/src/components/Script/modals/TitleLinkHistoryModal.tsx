import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TitleListHistoryItem } from '../titles/TitleListEditor';

interface TitleLinkHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: TitleListHistoryItem[];
    onUseItem: (item: TitleListHistoryItem, mode: 'title' | 'link' | 'both') => void;
    onDeleteItem: (id: string) => void;
    onClear: () => void;
}

export const TitleLinkHistoryModal: React.FC<TitleLinkHistoryModalProps> = ({
    open,
    onOpenChange,
    items,
    onUseItem,
    onDeleteItem,
    onClear,
}) => {
    const [query, setQuery] = React.useState('');

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) =>
            String(item.title || '').toLowerCase().includes(q) ||
            String(item.link || '').toLowerCase().includes(q),
        );
    }, [items, query]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl bg-slate-900 border-white/10 text-white shadow-2xl rounded-[32px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400">history</span>
                        Storico Titolo + Link
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Riusa titoli e link salvati in precedenza nel progetto corrente.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 mt-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca titolo o link..."
                        className="flex-1 h-10 rounded-xl bg-slate-950/70 border border-white/10 px-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-blue-500/40"
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
                            Nessun elemento nello storico
                        </div>
                    ) : (
                        filtered.slice(0, 120).map((item) => (
                            <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                                <div className="text-sm font-semibold text-slate-200 truncate">
                                    {item.title || 'Titolo non disponibile'}
                                </div>
                                <div className="text-xs text-slate-500 truncate mt-0.5">
                                    {item.link || 'Link non disponibile'}
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => onUseItem(item, 'title')}
                                        disabled={!item.title}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 hover:bg-blue-600/30 disabled:opacity-40"
                                    >
                                        + Titolo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUseItem(item, 'link')}
                                        disabled={!item.link}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-40"
                                    >
                                        + Link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUseItem(item, 'both')}
                                        className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 text-[10px] font-bold border border-violet-500/30 hover:bg-violet-600/30"
                                    >
                                        Applica Payload
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteItem(item.id)}
                                        className="ml-auto px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-300 text-[10px] font-bold border border-white/10 hover:border-red-500/30"
                                    >
                                        X
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
