'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { DriveLink } from '@/lib/api';

export interface DriveUploadSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  driveGroups: { name: string; folder_id?: string }[];
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  loadingGroups: boolean;
  createProjectFolder: boolean;
  setCreateProjectFolder: (value: boolean) => void;
  selectedCopertina: string;
  setSelectedCopertina: (id: string) => void;
  loadingCopertine: boolean;
  driveUploadComplete: boolean;
  uploadedFileUrl: string;
  copertineOptions: DriveLink[];
  getCopertinaForGroup: (groupName: string) => DriveLink | undefined;
}

export function DriveUploadSection({
  enabled,
  onEnabledChange,
  driveGroups,
  selectedGroup,
  setSelectedGroup,
  loadingGroups,
  createProjectFolder,
  setCreateProjectFolder,
  selectedCopertina,
  setSelectedCopertina,
  loadingCopertine,
  driveUploadComplete,
  uploadedFileUrl,
  copertineOptions,
  getCopertinaForGroup,
}: DriveUploadSectionProps) {
  const matchedCopertina = selectedGroup ? getCopertinaForGroup(selectedGroup) : undefined;

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="uploadToDrive"
          checked={enabled}
          onChange={(event) => {
            const checked = event.target.checked;
            onEnabledChange(checked);
            if (checked && !selectedGroup && driveGroups[0]) {
              setSelectedGroup(driveGroups[0].name);
            }
          }}
          className="rounded border-gray-300"
        />
        <label htmlFor="uploadToDrive" className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="h-4 w-4" />
          Upload to Google Drive
        </label>
      </div>

      {enabled ? (
        <div className="space-y-3 pl-6">
          <div className="space-y-2">
            <label htmlFor="drive-group" className="text-sm text-muted-foreground">
              Select Group
            </label>
            {loadingGroups ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading groups…
              </div>
            ) : driveGroups.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                No Drive groups found
              </div>
            ) : (
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger id="drive-group" className="w-full">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {driveGroups.map((group) => (
                    <SelectItem key={group.name} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createProjectFolder"
              checked={createProjectFolder}
              onChange={(event) => setCreateProjectFolder(event.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="createProjectFolder" className="text-sm text-muted-foreground">
              Create folder with project name
            </label>
          </div>

          {loadingCopertine ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cover folder…
            </div>
          ) : copertineOptions.length > 0 ? (
            <div className="space-y-2">
              <label htmlFor="drive-copertina" className="text-sm text-muted-foreground">
                Cover folder
              </label>
              <Select value={selectedCopertina} onValueChange={setSelectedCopertina}>
                <SelectTrigger id="drive-copertina" className="w-full">
                  <SelectValue placeholder="Select cover folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {copertineOptions.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                      {folder.language ? ` (${folder.language})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {matchedCopertina ? (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Auto-matched: {matchedCopertina.name}
                </div>
              ) : null}
            </div>
          ) : null}

          {driveUploadComplete && uploadedFileUrl ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Uploaded successfully
              <a
                href={uploadedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default DriveUploadSection;
