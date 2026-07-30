import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

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
                <Home className="size-4" />
                <span>root</span>
            </button>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <ChevronRight className="size-3.5 text-slate-500" />
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
