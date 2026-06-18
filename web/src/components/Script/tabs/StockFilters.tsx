import React from 'react';

interface StockFiltersProps {
    clipLength: number;
    onClipLengthChange: (value: number) => void;
    segmentLength: number;
    onSegmentLengthChange: (value: number) => void;
}

const CLIP_LENGTH_OPTIONS = [3, 5, 7, 10, 15, 20];
const SEGMENT_LENGTH_OPTIONS = [10, 15, 20, 25, 30, 45, 60, 90, 120];

export const StockFilters: React.FC<StockFiltersProps> = ({
    clipLength,
    onClipLengthChange,
    segmentLength,
    onSegmentLengthChange,
}) => {
    return (
        <>
            {/* Clip Length Dropdown */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    Lunghezza Clip (sec)
                </label>
                <select
                    value={clipLength}
                    onChange={(e) => onClipLengthChange(Number(e.target.value))}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all hover:border-white/20 cursor-pointer"
                >
                    {CLIP_LENGTH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt} secondi</option>
                    ))}
                </select>
            </div>

            {/* Segment Length Dropdown */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">art_track</span>
                    Lunghezza Segmento (sec)
                </label>
                <select
                    value={segmentLength}
                    onChange={(e) => onSegmentLengthChange(Number(e.target.value))}
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-sky-500/40 outline-none transition-all hover:border-white/20 cursor-pointer"
                >
                    {SEGMENT_LENGTH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt} secondi</option>
                    ))}
                </select>
            </div>

            {/* Info Box */}
            <div className="mt-4 flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-sky-400 text-lg">info</span>
                <p className="text-xs text-slate-400">
                    <span className="text-slate-300 font-semibold">Clip:</span> durata di ogni singolo video stock scaricato.
                    <span className="text-slate-300 font-semibold ml-3">Segmento:</span> durata totale del montaggio stock finale.
                </p>
            </div>
        </>
    );
};