import React from 'react';
import { HomeView } from '../../YouTubeManager/HomeView';
import { LibraryView } from '../../YouTubeManager/LibraryView';
import type { YTView } from '../hooks/useYouTubeManagerApp';

interface ContentAreaProps {
  currentView: YTView;
  refreshKey: number;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ currentView, refreshKey }) => {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      {currentView === 'home' && <HomeView key={`home-${refreshKey}`} />}
      {currentView === 'channels' && <LibraryView key={`library-${refreshKey}`} />}
    </div>
  );
};