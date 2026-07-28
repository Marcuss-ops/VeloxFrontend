import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultTemplates } from '../data/defaultTemplates';
import {
  applyTemplate as applyTemplateEngine,
  batchApplyTemplate as batchApplyTemplateEngine,
} from '../lib/templateEngine';
import { CanvasObject } from './editorStore';

// Re-export the engine's wire types for back-compat with any legacy
// `@/stores/templateStore` consumer that reaches Template / TemplateVariable
// / TemplateCondition through the barrel (the dark editor's own UI + the
// AdvancedTemplatePanel only import from the barrel, so this preserves
// their compile-time contract unchanged).
export type {
  Template,
  TemplateVariable,
  TemplateCondition,
} from '../lib/templateEngine';

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
        // Delegate to the pure engine function. Engine owns the substitution
        // contract — see lib/templateEngine.ts.
        return applyTemplateEngine(template, variables);
      },
      
      batchApplyTemplate: (templateId, dataSets) => {
        const template = get().getTemplate(templateId);
        if (!template) return dataSets.map(() => []);
        return batchApplyTemplateEngine(template, dataSets);
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