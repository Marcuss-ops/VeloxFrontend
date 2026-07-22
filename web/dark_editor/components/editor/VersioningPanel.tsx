import React, { useState, useEffect } from 'react';
import { useVersioningStore, Version } from '@/stores/versioningStore';
import { useEditorStore } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { 
  History, 
  Save, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Play, 
  Download, 
  Upload,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

export default function VersioningPanel() {
  const { versions, isAutoSaving, autoSaveInterval, enableAutoSave, disableAutoSave, saveCurrentState, compareVersions } = useVersioningStore();
  const objects = useObjectsArray();
  const { currentProject } = useProjectStore();
  const { addToast } = useUIStore();
  
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [versionToCompare, setVersionToCompare] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<any>(null);
  const [changes, setChanges] = useState<string[]>([]);
  
  const projectId = currentProject?.id || 'default';
  const projectVersions = useVersioningStore((state) => state.getVersionsForProject(projectId));
  
  // Auto-save effect
  useEffect(() => {
    if (isAutoSaving && objects.length > 0) {
      const interval = setInterval(() => {
        saveCurrentState(objects, projectId);
      }, autoSaveInterval);
      
      return () => clearInterval(interval);
    }
  }, [isAutoSaving, objects, projectId, autoSaveInterval, saveCurrentState]);
  
  const handleSaveVersion = () => {
    const name = prompt('Enter version name:', `Version ${new Date().toLocaleString()}`);
    if (name) {
      saveCurrentState(objects, projectId);
      addToast({
        type: 'success',
        message: `Version "${name}" saved successfully`,
      });
    }
  };
  
  const handleLoadVersion = (versionId: string) => {
    const version = projectVersions.find(v => v.id === versionId);
    if (version) {
      // This would trigger loading in the editor store
      // For now, we'll just show a toast
      addToast({
        type: 'info',
        message: `Loading version: ${version.name}`,
      });
      setSelectedVersion(versionId);
    }
  };
  
  const handleCompareVersions = () => {
    if (selectedVersion && versionToCompare) {
      const result = compareVersions(selectedVersion, versionToCompare);
      setDiffData(result.diff);
      setChanges(result.changes);
      setShowDiff(true);
    }
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const getVersionIcon = (name: string) => {
    if (name.toLowerCase().includes('auto')) return <Clock className="w-4 h-4 text-slate-500" />;
    return <Save className="w-4 h-4 text-primary" />;
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-section">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="sidebar-section-title">Versioning</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => isAutoSaving ? disableAutoSave() : enableAutoSave(30000)}
              className={`p-1.5 rounded-lg transition-all ${
                isAutoSaving 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={isAutoSaving ? 'Disable Auto-save' : 'Enable Auto-save'}
            >
              <Settings className="w-4 h-4" />
            </button>
            {isAutoSaving && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Auto-save: {Math.round(autoSaveInterval / 1000)}s
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {projectVersions.length} versions • {isAutoSaving ? 'Auto-saving enabled' : 'Auto-saving disabled'}
        </p>
      </div>
      
      {/* Controls */}
      <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={handleSaveVersion}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            Save Version
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              compareMode 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Versions'}
          </button>
        </div>
      </div>
      
      {/* Version List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {projectVersions.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No versions yet</p>
            <p className="text-xs">Save your first version to start tracking changes</p>
          </div>
        ) : (
          projectVersions.map((version) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedVersion === version.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setSelectedVersion(version.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getVersionIcon(version.name)}
                  <span className="font-medium text-sm">{version.name}</span>
                </div>
                <span className="text-xs text-slate-500">{formatTime(version.timestamp)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {version.objects.length} objects
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadVersion(version.id);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    title="Load Version"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (compareMode && versionToCompare !== version.id) {
                        setVersionToCompare(version.id);
                      }
                    }}
                    className={`p-1 rounded ${
                      compareMode && versionToCompare === version.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Select for Compare"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Delete version logic would go here
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    title="Delete Version"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              {compareMode && selectedVersion === version.id && (
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                  Selected for comparison
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Compare Actions */}
      {compareMode && selectedVersion && versionToCompare && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleCompareVersions}
              className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Compare
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                showDiff 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {showDiff ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          </div>
        </div>
      )}
      
      {/* Diff View */}
      {showDiff && diffData && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <h4 className="font-semibold text-sm">Changes</h4>
          
          {changes.length > 0 && (
            <div className="space-y-2">
              {changes.map((change, index) => (
                <div key={index} className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                  {change}
                </div>
              ))}
            </div>
          )}
          
          {diffData.added.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-green-600 mb-2">Added Objects</h5>
              <div className="space-y-1">
                {diffData.added.map((obj: any) => (
                  <div key={obj.id} className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-1 rounded">
                    + {obj.type}: {obj.name || obj.id}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {diffData.removed.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-600 mb-2">Removed Objects</h5>
              <div className="space-y-1">
                {diffData.removed.map((obj: any) => (
                  <div key={obj.id} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-1 rounded">
                    - {obj.type}: {obj.name || obj.id}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {diffData.modified.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-yellow-600 mb-2">Modified Objects</h5>
              <div className="space-y-2">
                {diffData.modified.map((mod: any) => (
                  <div key={mod.id} className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    <div className="font-medium mb-1">Object: {mod.id}</div>
                    <div className="space-y-1">
                      {mod.changes.map((change: string, index: number) => (
                        <div key={index} className="text-xs">• {change}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}