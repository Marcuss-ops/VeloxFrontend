import React from 'react';

interface BreadcrumbProps {
    path: string;
    onNavigate: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
    const parts = path.split('/').filter(Boolean);

    return (
        <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
                onClick={() => onNavigate('')}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            >
                <span className="material-symbols-rounded text-[16px]">home</span>
                <span>root</span>
            </button>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <span className="material-symbols-rounded text-text-muted text-[14px]">chevron_right</span>
                    <button
                        onClick={() => onNavigate(parts.slice(0, index + 1).join('/'))}
                        className="px-2 py-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                    >
                        {part}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

export default Breadcrumb;
