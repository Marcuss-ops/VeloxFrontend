import React from 'react';

interface AssetConfigProps {
    background: string;
    music: string;
    onBackgroundChange: (val: string) => void;
    onMusicChange: (val: string) => void;
}

const AssetSelector: React.FC<{
    icon: string;
    label: string;
    value: string;
    iconColor: string;
    onAdd: () => void;
}> = ({ icon, label, value, iconColor, onAdd }) => (
    <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</label>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-300 font-medium">
                {value}
            </div>
            <button
                onClick={onAdd}
                className="w-10 h-10 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all shadow-sm"
            >
                <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
        </div>
    </div>
);

export const AssetConfig: React.FC<AssetConfigProps> = ({
    background,
    music,
    onBackgroundChange,
    onMusicChange
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border-b border-white/5 bg-slate-900/20">
            <AssetSelector
                icon="wallpaper"
                label="Background"
                value={background}
                iconColor="text-emerald-400"
                onAdd={() => onBackgroundChange('')}
            />
            <AssetSelector
                icon="music_note"
                label="Music"
                value={music}
                iconColor="text-amber-400"
                onAdd={() => onMusicChange('')}
            />
        </div>
    );
};
