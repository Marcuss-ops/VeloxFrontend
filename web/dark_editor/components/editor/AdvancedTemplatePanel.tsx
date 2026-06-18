import React, { useState, useEffect } from 'react';
import { useTemplateStore, Template, TemplateVariable } from '@/stores/templateStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Save,
  Play,
  Settings,
  Tag,
  Folder,
  Eye,
  EyeOff,
  Database,
  Variable
} from 'lucide-react';

export default function AdvancedTemplatePanel() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, searchTemplates, getTemplateCategories, getTemplateTags } = useTemplateStore();
  const { addObject } = useEditorStore();
  const { addToast } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showVariables, setShowVariables] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchData, setBatchData] = useState<Array<Record<string, string | number>>>([]);
  
  const categories = useTemplateStore(state => state.getTemplateCategories());
  const tags = useTemplateStore(state => state.getTemplateTags());
  
  const filteredTemplates = searchTemplates(searchQuery).filter(template => {
    if (selectedCategory && template.category !== selectedCategory) return false;
    if (selectedTags.length > 0 && !selectedTags.some(tag => template.tags?.includes(tag))) return false;
    return true;
  });
  
  const handleApplyTemplate = (templateId: string, variables?: Record<string, string | number>) => {
    const appliedObjects = useTemplateStore.getState().applyTemplate(templateId, variables);
    appliedObjects.forEach(obj => addObject(obj));
    addToast({
      type: 'success',
      message: `Template applied successfully`,
    });
  };
  
  const handleBatchApply = () => {
    if (batchData.length === 0) return;
    
    const templateId = prompt('Enter template ID to apply to all data sets:');
    if (!templateId) return;
    
    const results = useTemplateStore.getState().batchApplyTemplate(templateId, batchData);
    results.forEach(objects => {
      objects.forEach(obj => addObject(obj));
    });
    
    addToast({
      type: 'success',
      message: `Batch applied ${results.length} templates`,
    });
  };
  
  const exportTemplate = (template: Template) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const importTemplate = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const template = JSON.parse(text);
        addTemplate(template);
        addToast({
          type: 'success',
          message: 'Template imported successfully',
        });
      } catch (error) {
        addToast({
          type: 'error',
          message: 'Failed to import template',
        });
      }
    };
    input.click();
  };
  
  const createTemplate = () => {
    const name = prompt('Enter template name:');
    if (!name) return;
    
    const descriptionInput = prompt('Enter template description (optional):', '');
    const type = prompt('Enter template type (complete/text/dynamic):', 'complete') as Template['type'];
    const categoryInput = prompt('Enter template category:', '');
    const tagsInput = prompt('Enter tags (comma-separated):', '');
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
    
    addTemplate({
      name,
      description: descriptionInput || undefined,
      type,
      objects: [],
      category: categoryInput || undefined,
      tags,
    });
    
    addToast({
      type: 'success',
      message: 'Template created successfully',
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-section">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <h3 className="sidebar-section-title">Advanced Templates</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createTemplate}
              className="p-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all"
              title="Create Template"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={importTemplate}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="Import Template"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {templates.length} templates • {categories.length} categories
        </p>
      </div>
      
      {/* Search & Filters */}
      <div className="p-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
          </div>
        </div>
        
        {/* Tags Filter */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-2 py-1 rounded-full text-xs ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Batch Mode */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Batch Processing</span>
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`px-3 py-1 rounded-full text-xs ${
              batchMode
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {batchMode ? 'Disable' : 'Enable'} Batch Mode
          </button>
        </div>
        
        {batchMode && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setBatchData([...batchData, {}])}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold"
              >
                Add Data Set
              </button>
              <button
                onClick={handleBatchApply}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold"
              >
                Apply Batch
              </button>
            </div>
            
            {batchData.map((dataSet, index) => (
              <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Data Set {index + 1}</span>
                  <button
                    onClick={() => setBatchData(batchData.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Variable name"
                    className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No templates found</p>
            <p className="text-xs">Create or search for templates</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={handleApplyTemplate}
                onExport={exportTemplate}
                onShowVariables={setShowVariables}
                isVariablesVisible={showVariables === template.id}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <TemplateListItem
                key={template.id}
                template={template}
                onApply={handleApplyTemplate}
                onExport={exportTemplate}
                onShowVariables={setShowVariables}
                isVariablesVisible={showVariables === template.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({ 
  template, 
  onApply, 
  onExport, 
  onShowVariables, 
  isVariablesVisible 
}: { 
  template: Template;
  onApply: (id: string, variables?: Record<string, string | number>) => void;
  onExport: (template: Template) => void;
  onShowVariables: (id: string | null) => void;
  isVariablesVisible: boolean;
}) {
  const [variables, setVariables] = useState<Record<string, string | number>>({});
  
  const handleApply = () => {
    onApply(template.id, variables);
  };
  
  const handleVariableChange = (variableId: string, value: string | number) => {
    setVariables(prev => ({ ...prev, [variableId]: value }));
  };
  
  return (
    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-slate-500">{template.description}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-1 rounded-full text-xs ${
            template.type === 'complete' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
            template.type === 'text' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
            'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
          }`}>
            {template.type}
          </span>
          {template.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {template.category}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{template.objects.length} objects</span>
          {template.variables && template.variables.length > 0 && (
            <span className="flex items-center gap-1">
              <Variable className="w-3 h-3" />
              {template.variables.length} variables
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onShowVariables(isVariablesVisible ? null : template.id)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Show Variables"
          >
            <Variable className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExport(template)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Export Template"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map(tag => (
            <span key={tag} className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Variables Form */}
      {isVariablesVisible && template.variables && template.variables.length > 0 && (
        <div className="space-y-2 mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Variables</span>
            <button
              onClick={() => onShowVariables(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Hide
            </button>
          </div>
          {template.variables.map(variable => (
            <VariableInput
              key={variable.id}
              variable={variable}
              value={variables[variable.id]}
              onChange={(value) => handleVariableChange(variable.id, value)}
            />
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Play className="w-4 h-4" />
          Apply Template
        </button>
      </div>
    </div>
  );
}

// Template List Item Component
function TemplateListItem({ 
  template, 
  onApply, 
  onExport, 
  onShowVariables, 
  isVariablesVisible 
}: { 
  template: Template;
  onApply: (id: string, variables?: Record<string, string | number>) => void;
  onExport: (template: Template) => void;
  onShowVariables: (id: string | null) => void;
  isVariablesVisible: boolean;
}) {
  const [variables, setVariables] = useState<Record<string, string | number>>({});
  
  const handleApply = () => {
    onApply(template.id, variables);
  };
  
  const handleVariableChange = (variableId: string, value: string | number) => {
    setVariables(prev => ({ ...prev, [variableId]: value }));
  };
  
  return (
    <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-slate-500">{template.description}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>{template.objects.length} objects</span>
            {template.variables && template.variables.length > 0 && (
              <span>{template.variables.length} variables</span>
            )}
            {template.category && <span>• {template.category}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onShowVariables(isVariablesVisible ? null : template.id)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Show Variables"
          >
            <Variable className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExport(template)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            title="Export Template"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
      
      {/* Variables Form */}
      {isVariablesVisible && template.variables && template.variables.length > 0 && (
        <div className="mt-3 space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Variables</span>
            <button
              onClick={() => onShowVariables(null)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {template.variables.map(variable => (
              <VariableInput
                key={variable.id}
                variable={variable}
                value={variables[variable.id]}
                onChange={(value) => handleVariableChange(variable.id, value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Variable Input Component
function VariableInput({ 
  variable, 
  value, 
  onChange 
}: { 
  variable: TemplateVariable; 
  value?: string | number; 
  onChange: (value: string | number) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = variable.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    onChange(val);
  };
  
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-600 dark:text-slate-300">{variable.name}</label>
      {variable.type === 'color' ? (
        <input
          type="color"
          value={value as string || variable.defaultValue as string}
          onChange={handleChange}
          className="w-full h-8 rounded border border-slate-200 dark:border-slate-700"
        />
      ) : variable.type === 'number' ? (
        <input
          type="number"
          value={value as number || variable.defaultValue as number}
          onChange={handleChange}
          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded"
        />
      ) : (
        <input
          type="text"
          value={value as string || variable.defaultValue as string}
          onChange={handleChange}
          placeholder={variable.placeholder}
          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded"
        />
      )}
    </div>
  );
}