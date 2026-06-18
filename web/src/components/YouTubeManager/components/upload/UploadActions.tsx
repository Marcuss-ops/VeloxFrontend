/**
 * UploadActions Component
 * Pure presentational component for publish/schedule action buttons
 */

import React from 'react';
import { Upload, Calendar, Loader2 } from 'lucide-react';

export interface UploadActionsProps {
  /** Whether publishing is in progress */
  isPublishing: boolean;
  /** Whether publish button should be disabled */
  disablePublish: boolean;
  /** Whether schedule button should be disabled */
  disableSchedule: boolean;
  /** Publish now handler */
  onPublishNow: () => void;
  /** Schedule publish handler */
  onSchedule: () => void;
}

export const UploadActions: React.FC<UploadActionsProps> = ({
  isPublishing,
  disablePublish,
  disableSchedule,
  onPublishNow,
  onSchedule,
}) => {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onPublishNow}
        disabled={isPublishing || disablePublish}
        className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
      >
        {isPublishing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Publish now
          </>
        )}
      </button>
      <button
        onClick={onSchedule}
        disabled={isPublishing || disableSchedule}
        className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isPublishing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            Schedule
          </>
        )}
      </button>
    </div>
  );
};

export default UploadActions;
