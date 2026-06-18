import React from 'react';
import { useYouTubeManagerApp } from './hooks/useYouTubeManagerApp';
import { SideNavigation } from './components/SideNavigation';
import { ContentArea } from './components/ContentArea';
import { AddChannelModal } from '../YouTubeManager/components/channels/AddChannelModal';

export const YouTubeManagerApp: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    addChannelModalOpen,
    setAddChannelModalOpen,
    addChannelTargetGroup,
    refreshKey,
    handleAddChannel,
  } = useYouTubeManagerApp();

  return (
    <div className="react-yt-manager-container max-w-[1440px] mx-auto w-full min-h-screen text-white flex flex-col px-6 py-8">
      <SideNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <ContentArea
        currentView={currentView}
        refreshKey={refreshKey}
      />

      {/* Add Channel Modal */}
      <AddChannelModal
        isOpen={addChannelModalOpen}
        onClose={() => setAddChannelModalOpen(false)}
        groupName={addChannelTargetGroup}
        onAddChannel={handleAddChannel}
      />
    </div>
  );
};