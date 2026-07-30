import React from 'react';

interface SectionCardProps {
    title: string;
    icon: string;
    iconColor: string;
    children: React.ReactNode;
    collapsed?: boolean;
    onToggle?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, icon, iconColor, children, collapsed = false, onToggle }) => (
    <div className="bg-card border border rounded-xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2">
                <span className={`material-symbols-rounded ${iconColor}`}>{icon}</span>
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            </div>
            <span className={`material-symbols-rounded text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                expand_more
            </span>
        </button>
        {!collapsed && (
            <div className="px-4 pb-4 border-t border/50">
                {children}
            </div>
        )}
    </div>
);

export default SectionCard;
