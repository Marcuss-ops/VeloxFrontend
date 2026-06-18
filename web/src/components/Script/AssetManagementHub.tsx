import React, { useEffect, useRef, useState } from 'react';
import { ClipFolders, StockTimestamp } from './types';
import { StockSuggestions } from './StockSuggestions';

interface AssetManagementHubProps {
    clipFolders: ClipFolders;
    voiceoverStatus: string; // e.g., "0 voiceover"
    stockItems: StockTimestamp[];
    onDriveClick: (type: string, payload?: Record<string, unknown>) => void;
    driveFolders?: {
        clipName?: string | null;
        stockName?: string | null;
        voiceoverName?: string | null;
    };
    canUndo?: boolean;
    onUndo?: () => void;
    onReorderClip?: (type: 'initial' | 'inter' | 'final', fromIndex: number, toIndex: number) => void;
    onMoveClip?: (fromType: 'initial' | 'inter' | 'final', toType: 'initial' | 'inter' | 'final', index: number) => void;
    onRemoveClip?: (type: 'initial' | 'inter' | 'final', index: number) => void;
    onRemoveStockItem?: (index: number) => void;
    onClearVoiceover?: () => void;
    // Props per Stock Suggestions
    currentTitle?: string;
    stockMainFolderId?: string | null;
    onAddStockFolder?: (folder: { id: string; name: string }) => void;
}

const ManagementSection: React.FC<{
    icon: string;
    label: string;
    iconColor: string;
    children: React.ReactNode;
    onDriveClick?: () => void;
    onDriveHover?: () => void;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    collapsedSummary?: React.ReactNode;
}> = ({ icon, label, iconColor, children, onDriveClick, onDriveHover, collapsed = false, onToggleCollapsed, collapsedSummary }) => (
    <div className="flex-1 min-w-[320px] min-h-[440px] space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-white/10 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
                <label className="text-base font-semibold text-slate-100 tracking-wide">{label}</label>
            </div>
            <div className="flex items-center gap-1.5">
                {onDriveClick && (
                    <button
                        onClick={onDriveClick}
                        onMouseEnter={onDriveHover}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 border border-slate-600/60 text-slate-200 hover:bg-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
                        Drive
                    </button>
                )}
                {onToggleCollapsed && (
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        className="h-7 w-7 rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800 transition-colors"
                        title={collapsed ? 'Espandi sezione' : 'Comprimi sezione'}
                    >
                        <span className="material-symbols-outlined text-[16px]">{collapsed ? 'expand_more' : 'expand_less'}</span>
                    </button>
                )}
            </div>
        </div>
        {!collapsed ? <div className="space-y-3">{children}</div> : collapsedSummary ? <div>{collapsedSummary}</div> : null}
    </div>
);

const ClipTypeSection: React.FC<{
    type: 'initial' | 'inter' | 'final';
    icon: string;
    label: string;
    iconColor: string;
    count: number;
    items: string[];
    onDriveClick?: () => void;
    onDriveHover?: () => void;
    onReorderClip?: (type: 'initial' | 'inter' | 'final', fromIndex: number, toIndex: number) => void;
    onMoveClip?: (fromType: 'initial' | 'inter' | 'final', toType: 'initial' | 'inter' | 'final', index: number) => void;
    onRemoveClip?: (type: 'initial' | 'inter' | 'final', index: number) => void;
}> = ({ type, icon, label, iconColor, count, items, onDriveClick, onDriveHover, onReorderClip, onMoveClip, onRemoveClip }) => {
    const [hoverTimer, setHoverTimer] = useState<number | null>(null);
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    const startHover = () => {
        if (!onDriveHover) return;
        if (hoverTimer) window.clearTimeout(hoverTimer);
        const t = window.setTimeout(() => onDriveHover(), 1500);
        setHoverTimer(t);
    };
    const endHover = () => {
        if (hoverTimer) window.clearTimeout(hoverTimer);
        setHoverTimer(null);
    };
    return (
    <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 min-h-[120px]">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${iconColor.replace('text', 'bg').replace('400', '500')}/20 border-${iconColor.replace('text-', '')}/30`}>
                    <span className={`material-symbols-outlined text-[15px] ${iconColor}`}>{icon}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200">{label}</h4>
                <span className="bg-white/5 px-2 py-0.5 rounded-md text-xs text-slate-400 font-medium border border-white/10">{count} clip</span>
            </div>
            <button
                type="button"
                onClick={onDriveClick}
                onMouseEnter={startHover}
                onMouseLeave={endHover}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 border border-slate-600/60 text-slate-200 hover:bg-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
                <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
                Drive
            </button>
        </div>
        {items.length === 0 ? (
            <div className="text-xs text-slate-500 italic">Nessuna clip selezionata</div>
        ) : (
            <div className="space-y-1.5">
                {items.slice(0, 8).map((item, idx) => (
                    <div
                        key={`${item}-${idx}`}
                        draggable
                        onDragStart={() => setDragFrom(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                            if (dragFrom === null || dragFrom === idx || !onReorderClip) return;
                            onReorderClip(type, dragFrom, idx);
                            setDragFrom(null);
                        }}
                        onDragEnd={() => setDragFrom(null)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-950/70 border border-white/10 cursor-grab active:cursor-grabbing"
                        title={item}
                    >
                        <span className="material-symbols-outlined text-[12px] text-slate-500">drag_indicator</span>
                        <span className="text-xs text-slate-300 truncate flex-1">{item}</span>
                        {onMoveClip && (
                            <select
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const target = e.target.value as 'initial' | 'inter' | 'final' | '';
                                    if (!target) return;
                                    onMoveClip(type, target, idx);
                                    e.currentTarget.value = '';
                                }}
                                className="h-7 rounded-md border border-white/15 bg-slate-900/80 px-2 text-[11px] text-slate-300 outline-none"
                                title="Sposta clip in un'altra sezione"
                            >
                                <option value="">Sposta a...</option>
                                {type !== 'initial' && <option value="initial">Initial</option>}
                                {type !== 'inter' && <option value="inter">Medium</option>}
                                {type !== 'final' && <option value="final">Final</option>}
                            </select>
                        )}
                        {onRemoveClip && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveClip(type, idx);
                                }}
                                className="ml-1 px-2 py-1 rounded-md border border-white/15 text-[11px] text-slate-400 hover:text-red-300 hover:border-red-500/30 transition-colors"
                                title="Rimuovi clip"
                            >
                                Rimuovi
                            </button>
                        )}
                    </div>
                ))}
                {items.length > 8 && (
                    <div className="text-xs text-slate-500">+{items.length - 8} altri</div>
                )}
            </div>
        )}
    </div>
    );
};

export const AssetManagementHub: React.FC<AssetManagementHubProps> = ({
    clipFolders,
    voiceoverStatus,
    stockItems,
    onDriveClick,
    driveFolders,
    canUndo = false,
    onUndo,
    onReorderClip,
    onMoveClip,
    onRemoveClip,
    onRemoveStockItem,
    onClearVoiceover,
    currentTitle = '',
    stockMainFolderId = null,
    onAddStockFolder,
}) => {
    const hoverTsRef = useRef<Record<string, number>>({});
    const [isStockCollapsed, setIsStockCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem('script-tab-stock-collapsed');
        if (saved === null) return false;
        return saved === 'true';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('script-tab-stock-collapsed', String(isStockCollapsed));
    }, [isStockCollapsed]);

    const mkHoverHandler = (type: string) => () => {
        const now = Date.now();
        const last = hoverTsRef.current[type] || 0;
        if (now - last < 1200) return;
        hoverTsRef.current[type] = now;
        onDriveClick(type, { source: 'hover' });
    };

    const handleStockFolderSelect = (folder: { id: string; name: string }) => {
        if (onAddStockFolder) {
            onAddStockFolder(folder);
        }
    };

    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch [font-family:'Segoe_UI','Helvetica_Neue',Arial,sans-serif]">
            {/* Clip Management */}
            <ManagementSection
                icon="videocam"
                label="Clip Management"
                iconColor="text-blue-400"
            >
                {onUndo && (
                    <div className="mb-2">
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/40 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[13px]">undo</span>
                            Undo selezioni
                        </button>
                    </div>
                )}
                <div className="space-y-2">
                    <ClipTypeSection
                        type="initial"
                        icon="folder" label="Initial" iconColor="text-emerald-400" count={clipFolders.initial.length}
                        items={clipFolders.initial}
                        onDriveClick={() => onDriveClick('initial')}
                        onDriveHover={mkHoverHandler('initial')}
                        onReorderClip={onReorderClip}
                        onMoveClip={onMoveClip}
                        onRemoveClip={onRemoveClip}
                    />
                    {driveFolders?.clipName && (
                        <div className="text-xs text-slate-500 pl-1">Cartella gruppo: {driveFolders.clipName}</div>
                    )}
                    <ClipTypeSection
                        type="inter"
                        icon="shuffle" label="Medium" iconColor="text-amber-400" count={clipFolders.inter.length}
                        items={clipFolders.inter}
                        onDriveClick={() => onDriveClick('inter')}
                        onDriveHover={mkHoverHandler('inter')}
                        onReorderClip={onReorderClip}
                        onMoveClip={onMoveClip}
                        onRemoveClip={onRemoveClip}
                    />
                    <ClipTypeSection
                        type="final"
                        icon="stop" label="Final" iconColor="text-orange-400" count={clipFolders.final.length}
                        items={clipFolders.final}
                        onDriveClick={() => onDriveClick('final')}
                        onDriveHover={mkHoverHandler('final')}
                        onReorderClip={onReorderClip}
                        onMoveClip={onMoveClip}
                        onRemoveClip={onRemoveClip}
                    />
                </div>
            </ManagementSection>

            {/* Voiceover Generation */}
            <ManagementSection icon="graphic_eq" label="Voiceover" iconColor="text-purple-400" onDriveClick={() => onDriveClick('voiceover')} onDriveHover={mkHoverHandler('voiceover')}>
                <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Voiceover generati</div>
                    <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 min-h-[120px]">
                        <div className="text-xs text-purple-300 font-semibold mb-1.5">{voiceoverStatus}</div>
                        <div className="text-xs text-slate-500">
                            {voiceoverStatus.toLowerCase().includes('drive folder') ? 'Cartella voiceover configurata' : 'Nessun voiceover generato'}
                        </div>
                        {driveFolders?.voiceoverName && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="text-xs text-slate-500 truncate">Cartella gruppo: {driveFolders.voiceoverName}</div>
                                {onClearVoiceover && (
                                    <button
                                        type="button"
                                        onClick={onClearVoiceover}
                                        className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                                        title="Rimuovi voiceover"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ManagementSection>

            {/* Stock Management */}
            <ManagementSection
                icon="movie"
                label="Stock"
                iconColor="text-emerald-400"
                onDriveClick={() => onDriveClick('stock')}
                onDriveHover={mkHoverHandler('stock')}
                collapsed={isStockCollapsed}
                onToggleCollapsed={() => setIsStockCollapsed((v) => !v)}
                collapsedSummary={(
                    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="text-xs tracking-wide text-slate-400 mb-2.5 font-semibold">Drive Rapido Stock</div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">Stock selezionati: {stockItems.length}</span>
                            <button
                                type="button"
                                onClick={() => onDriveClick('stock')}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/30 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20"
                            >
                                <span className="material-symbols-outlined text-[12px] align-middle mr-1">add_to_drive</span>
                                Apri Drive
                            </button>
                        </div>
                    </div>
                )}
            >
                <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Stock selezionati ({stockItems.length})</div>
                    <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 min-h-[120px] flex items-center justify-center">
                        {stockItems.length === 0 ? (
                            <div className="text-xs text-slate-500 text-center">Nessuno stock selezionato. Clicca Drive per aggiungere cartelle stock.</div>
                        ) : (
                            <div className="w-full space-y-1.5">
                                {stockItems.slice(0, 8).map((it, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 text-left">
                                        <span className="truncate">{it.start}-{it.end} | {it.folder_name || it.folder_id}</span>
                                        {onRemoveStockItem && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveStockItem(idx)}
                                                className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                                                title="Rimuovi stock"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {driveFolders?.stockName && (
                        <div className="text-xs text-slate-500 pl-1">Cartella gruppo: {driveFolders.stockName}</div>
                    )}
                    
                    {/* Stock Suggestions - Nuova sezione */}
                    <StockSuggestions
                        title={currentTitle}
                        stockMainFolderId={stockMainFolderId}
                        onSelectFolder={handleStockFolderSelect}
                    />
                </div>
            </ManagementSection>
        </div>
    );
};