'use client';

import { useState } from 'react';
import { Folder, FolderPlus, Pencil, Trash2, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface ProjectFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ProjectFoldersProps {
  folders: ProjectFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  folderProjectCounts?: Map<string, number>;
  allProjectsCount?: number;
}

export function ProjectFolders({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  folderProjectCounts,
  allProjectsCount,
}: ProjectFoldersProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const rootFolders = folders.filter(f => !f.parent_id);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), null);
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleRename = (folderId: string) => {
    if (editingName.trim()) {
      onRenameFolder(folderId, editingName.trim());
      setEditingFolderId(null);
      setEditingName('');
    }
  };

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getChildFolders = (parentId: string) => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const renderFolder = (folder: ProjectFolder, depth = 0) => {
    const childFolders = getChildFolders(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isEditing = editingFolderId === folder.id;
    const isSelected = selectedFolderId === folder.id;
    const projectCount = folderProjectCounts?.get(folder.id) ?? 0;

    return (
      <div key={folder.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
            hover:bg-accent group
            ${isSelected ? 'bg-primary/10 text-primary' : 'text-foreground'}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {childFolders.length > 0 ? (
            <button
              onClick={() => toggleExpand(folder.id)}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(folder.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename(folder.id)}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <>
              <button
                onClick={() => onSelectFolder(folder.id)}
                className="flex items-center gap-2 flex-1"
              >
                {isExpanded && childFolders.length > 0 ? (
                  <FolderOpen className="w-4 h-4 text-primary" />
                ) : (
                  <Folder className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm truncate">{folder.name}</span>
                {projectCount > 0 ? (
                  <span className="text-xs text-muted-foreground">({projectCount})</span>
                ) : null}
              </button>

              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingFolderId(folder.id);
                    setEditingName(folder.name);
                  }}
                  className="p-1 hover:bg-accent rounded"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onDeleteFolder(folder.id)}
                  className="p-1 hover:bg-destructive/20 rounded"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </>
          )}
        </div>

        {isExpanded && childFolders.length > 0 && (
          <div>
            {childFolders.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div
        onClick={() => onSelectFolder(null)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
          hover:bg-accent
          ${selectedFolderId === null ? 'bg-primary/10 text-primary' : 'text-foreground'}
        `}
      >
        <Folder className="w-4 h-4" />
        <span className="text-sm">All Projects</span>
        {typeof allProjectsCount === 'number' ? (
          <span className="text-xs text-muted-foreground">({allProjectsCount})</span>
        ) : null}
      </div>

      {rootFolders.map(folder => renderFolder(folder))}

      {isCreating ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <FolderPlus className="w-4 h-4 text-muted-foreground" />
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            placeholder="Folder name..."
            className="h-6 text-sm"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-2 w-full text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="text-sm">New Folder</span>
        </button>
      )}
    </div>
  );
}
