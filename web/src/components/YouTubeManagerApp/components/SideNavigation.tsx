import React from 'react';
import type { YTView } from '../hooks/useYouTubeManagerApp';

interface SideNavigationProps {
  currentView: YTView;
  onViewChange: (view: YTView) => void;
}

export const SideNavigation: React.FC<SideNavigationProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/80 px-4 py-2 flex gap-1">
      <button
        type="button"
        onClick={() => onViewChange('home')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
          currentView === 'home'
            ? 'bg-primary text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <span className="material-symbols-rounded text-[18px]">search</span>
        Search
      </button>
      <button
        type="button"
        onClick={() => onViewChange('channels')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
          currentView === 'channels'
            ? 'bg-primary text-white'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <span className="material-symbols-rounded text-[18px]">folder_special</span>
        Groups
      </button>
    </div>
  );
};