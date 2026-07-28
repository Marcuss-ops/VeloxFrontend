import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultTemplates } from '../data/defaultTemplates';
import { CanvasObject } from './editorStore';

export interface TemplateVariable {
  id: string;
  name: string;
  type: 'text' | 'color' | 'image' | 'number';
  defaultValue: string | number;
  placeholder?: string;
}

export interface TemplateCondition {
  id: string;
  variableId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'complete' | 'text' | 'dynamic';
  objects: CanvasObject[];
  variables?: TemplateVariable[];
  conditions?: TemplateCondition[];
  previewUrl?: string;
  createdAt: number;
  updatedAt: number;
  category?: string;
  tags?: string[];
}

export interface TemplateStore {
  templates: Template[];
  
  // Actions
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  getTemplates: (type?: Template['type'], category?: string) => Template[];
  getTemplate: (id: string) => Template | undefined;
  applyTemplate: (id: string, variables?: Record<string, string | number>) => CanvasObject[];
  batchApplyTemplate: (templateId: string, dataSets: Record<string, string | number>[]) => CanvasObject[][];
  searchTemplates: (query: string) => Template[];
  getTemplateCategories: () => string[];
  getTemplateTags: () => string[];
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      
      addTemplate: (template) => {
        const newTemplate: Template = {
          ...template,
          id: Date.now().toString(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
      },
      
      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map(template => 
            template.id === id 
              ? { ...template, ...updates, updatedAt: Date.now() }
              : template
          ),
        }));
      },
      
      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter(template => template.id !== id),
        }));
      },
      
      getTemplates: (type, category) => {
        const { templates } = get();
        return templates
          .filter(template => {
            if (type && template.type !== type) return false;
            if (category && template.category !== category) return false;
            return true;
          })
          .sort((a, b) => b.updatedAt - a.updatedAt);
      },
      
      getTemplate: (id) => {
        const { templates } = get();
        return templates.find(template => template.id === id);
      },
      
      applyTemplate: (id, variables = {}) => {
        const template = get().getTemplate(id);
        if (!template) return [];
        
        const appliedObjects = template.objects.map(obj => {
          const clonedObj = JSON.parse(JSON.stringify(obj));
          
          // Replace variables in text
          if (clonedObj.text && typeof clonedObj.text === 'string') {
            let text = clonedObj.text;
            Object.entries(variables).forEach(([key, value]) => {
              text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
            clonedObj.text = text;
          }
          
          // Replace variables in fill color
          if (clonedObj.fill && typeof clonedObj.fill === 'string') {
            let fill = clonedObj.fill;
            Object.entries(variables).forEach(([key, value]) => {
              fill = fill.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
            clonedObj.fill = fill;
          }
          
          return clonedObj;
        });
        
        return appliedObjects;
      },
      
      batchApplyTemplate: (templateId, dataSets) => {
        return dataSets.map(dataSet => get().applyTemplate(templateId, dataSet));
      },
      
      searchTemplates: (query) => {
        const { templates } = get();
        const q = query.toLowerCase();
        return templates.filter(template => 
          template.name.toLowerCase().includes(q) ||
          template.description?.toLowerCase().includes(q) ||
          template.tags?.some(tag => tag.toLowerCase().includes(q)) ||
          template.variables?.some(variable => variable.name.toLowerCase().includes(q))
        );
      },
      
      getTemplateCategories: () => {
        const { templates } = get();
        const categories = new Set(templates.map(t => t.category).filter((cat): cat is string => Boolean(cat)));
        return Array.from(categories);
      },
      
      getTemplateTags: () => {
        const { templates } = get();
        const tags = new Set(templates.flatMap(t => t.tags || []));
        return Array.from(tags);
      },
    }),
    {
      name: 'dark-editor-templates',
      partialize: (state) => ({
        templates: state.templates,
      }),
    }
  )
);