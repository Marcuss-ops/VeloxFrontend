import React, { useState, useEffect } from 'react';
import { usePresetStore, Preset } from '@/stores/presetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { Plus, Search, Filter, Trash2, Download, Edit, Save } from 'lucide-react';

export default function PresetPanel() {
  const { presets, isLoading, createPreset, deletePreset, loadPresets, searchPresets, filterPresets } = usePresetStore();
  const objects = useObjectsArray();
  const { loadObjects } = useEditorStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'complete' | 'text'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetType, setNewPresetType] = useState<'complete' | 'text'>('complete');
  
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);
  
  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return;
    
    const presetData = {
      name: newPresetName,
      type: newPresetType,
      description: newPresetDescription,
      objects: newPresetType === 'complete' ? objects : undefined,
      textObjects: newPresetType === 'text' ? objects.filter(obj => obj.type === 'text') : undefined,
    };
    
    try {
      await createPreset(presetData);
      setNewPresetName('');
      setNewPresetDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating preset:', error);
    }
  };
  
  const handleApplyPreset = async (preset: Preset) => {
    if (preset.type === 'complete' && preset.objects) {
      loadObjects(preset.objects);
    } else if (preset.type === 'text' && preset.textObjects) {
      // Add text objects to current canvas
      preset.textObjects.forEach(obj => {
        // TODO: Adjust position to avoid overlap
        useEditorStore.getState().addObject({
          ...obj,
          x: obj.x + 50,
          y: obj.y + 50,
        });
      });
    }
  };
  
  const filteredPresets = searchPresets(searchQuery);
  const typeFilteredPresets = filterPresets(filterType);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-section">
        <div className="flex items-center justify-between mb-1">
          <h3 className="sidebar-section-title">Presets</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Create Preset"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Save and reuse project templates and text blocks
        </p>
      </div>
      
      {/* Create Preset Form */}
      {showCreateForm && (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Preset Name
            </label>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Enter preset name..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newPresetDescription}
              onChange={(e) => setNewPresetDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Optional description..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="complete"
                  checked={newPresetType === 'complete'}
                  onChange={(e) => setNewPresetType(e.target.value as 'complete')}
                  className="text-primary"
                />
                <span className="text-sm">Complete Project</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="text"
                  checked={newPresetType === 'text'}
                  onChange={(e) => setNewPresetType(e.target.value as 'text')}
                  className="text-primary"
                />
                <span className="text-sm">Text Only</span>
              </label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreatePreset}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              Create Preset
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Search and Filter */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            All
          </button>
          <button
            onClick={() => setFilterType('complete')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterType === 'complete'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Complete
          </button>
          <button
            onClick={() => setFilterType('text')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterType === 'text'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Edit className="w-4 h-4" />
            Text
          </button>
        </div>
      </div>
      
      {/* Presets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : typeFilteredPresets.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <p>No presets found</p>
            <p className="text-xs mt-1">Create your first preset to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {typeFilteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{preset.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {preset.type === 'complete' ? 'Complete Project' : 'Text Template'}
                    </p>
                    {preset.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{preset.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                      title="Apply Preset"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Created: {new Date(preset.createdAt).toLocaleDateString()}</span>
                  <span>{preset.type === 'complete' ? preset.objects?.length || 0 : preset.textObjects?.length || 0} objects</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
