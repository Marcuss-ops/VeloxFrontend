import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      templates: [
        // Default templates
        {
          id: 'title-template',
          name: 'Title Template',
          description: 'Dynamic title with variables',
          type: 'text',
          objects: [
            {
              id: 'title-text',
              type: 'text',
              x: 100,
              y: 100,
              width: 800,
              height: 100,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Title',
              text: '{{title}}',
              fontSize: 64,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
            }
          ],
          variables: [
            {
              id: 'title',
              name: 'Title Text',
              type: 'text',
              defaultValue: 'Your Title Here',
              placeholder: 'Enter your title...',
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'Text',
          tags: ['title', 'text', 'dynamic'],
        },
        {
          id: 'thumbnail-template',
          name: 'Video Thumbnail',
          description: 'Complete thumbnail template with placeholders',
          type: 'complete',
          objects: [
            {
              id: 'bg-rect',
              type: 'rect',
              x: 0,
              y: 0,
              width: 1280,
              height: 720,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Background',
              fill: '{{bg_color}}',
            },
            {
              id: 'main-text',
              type: 'text',
              x: 100,
              y: 100,
              width: 1080,
              height: 200,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Main Title',
              text: '{{title}}',
              fontSize: 80,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
              textShadow: {
                offsetX: 4,
                offsetY: 4,
                blur: 8,
                color: '#000000',
              },
            },
            {
              id: 'subtitle-text',
              type: 'text',
              x: 100,
              y: 350,
              width: 1080,
              height: 100,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.8,
              visible: true,
              locked: false,
              name: 'Subtitle',
              text: '{{subtitle}}',
              fontSize: 40,
              fontFamily: 'Inter Bold',
              fill: '#ffffff',
            }
          ],
          variables: [
            {
              id: 'title',
              name: 'Main Title',
              type: 'text',
              defaultValue: 'VIDEO TITLE',
              placeholder: 'Enter main title...',
            },
            {
              id: 'subtitle',
              name: 'Subtitle',
              type: 'text',
              defaultValue: 'Subtitle or description',
              placeholder: 'Enter subtitle...',
            },
            {
              id: 'bg_color',
              name: 'Background Color',
              type: 'color',
              defaultValue: '#ff0000',
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'Video',
          tags: ['thumbnail', 'complete', 'dynamic'],
        },
        {
          id: 'telegiornale-template',
          name: 'Template Telegiornale',
          description: 'Breaking News layout with lower third banner',
          type: 'complete',
          objects: [
            {
              id: 'news-bg',
              type: 'rect',
              x: 0,
              y: 0,
              width: 1280,
              height: 720,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Background',
              fill: '#0f172a',
            },
            {
              id: 'red-header',
              type: 'rect',
              x: 50,
              y: 50,
              width: 320,
              height: 60,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Header Banner',
              fill: '#dc2626',
            },
            {
              id: 'header-text',
              type: 'text',
              x: 70,
              y: 60,
              width: 280,
              height: 40,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Header Text',
              text: 'TELEGIORNALE',
              fontSize: 28,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
            },
            {
              id: 'news-banner-bg',
              type: 'rect',
              x: 50,
              y: 500,
              width: 1180,
              height: 140,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.95,
              visible: true,
              locked: false,
              name: 'Lower Third Bar',
              fill: '#1e3a8a',
            },
            {
              id: 'news-banner-accent',
              type: 'rect',
              x: 50,
              y: 500,
              width: 150,
              height: 140,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Live Tag Accent',
              fill: '#dc2626',
            },
            {
              id: 'live-tag',
              type: 'text',
              x: 80,
              y: 545,
              width: 100,
              height: 40,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Live Tag',
              text: 'LIVE',
              fontSize: 36,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
            },
            {
              id: 'news-title',
              type: 'text',
              x: 230,
              y: 520,
              width: 950,
              height: 60,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Breaking News Title',
              text: '{{breaking_title}}',
              fontSize: 42,
              fontFamily: 'Inter Bold',
              fill: '#ffffff',
            },
            {
              id: 'news-ticker',
              type: 'text',
              x: 230,
              y: 585,
              width: 950,
              height: 40,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.8,
              visible: true,
              locked: false,
              name: 'Ticker Subtext',
              text: '{{ticker_text}}',
              fontSize: 22,
              fontFamily: 'Inter Medium',
              fill: '#fcd34d',
            }
          ],
          variables: [
            {
              id: 'breaking_title',
              name: 'Breaking News Title',
              type: 'text',
              defaultValue: 'ULTIMORA: NOTIZIA DEL GIORNO',
              placeholder: 'Inserisci titolo telegiornale...',
            },
            {
              id: 'ticker_text',
              name: 'Ticker Subtext',
              type: 'text',
              defaultValue: 'Dettagli e aggiornamenti in tempo reale dall\'inviato.',
              placeholder: 'Testo scorrevole inferiore...',
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'News',
          tags: ['telegiornale', 'breaking-news', 'complete', 'dynamic'],
        },
        {
          id: 'rap-trap-template',
          name: 'Template Rap/Trap Cover',
          description: 'Dark neon theme for music singles and trap album covers',
          type: 'complete',
          objects: [
            {
              id: 'music-bg',
              type: 'rect',
              x: 0,
              y: 0,
              width: 1280,
              height: 720,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Background',
              fill: '#020205',
            },
            {
              id: 'artist-text',
              type: 'text',
              x: 100,
              y: 120,
              width: 1080,
              height: 180,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Artist Name',
              text: '{{artist_name}}',
              fontSize: 110,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
              textShadow: {
                offsetX: 0,
                offsetY: 0,
                blur: 15,
                color: '#a78bfa',
              },
            },
            {
              id: 'song-text',
              type: 'text',
              x: 100,
              y: 320,
              width: 1080,
              height: 120,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.9,
              visible: true,
              locked: false,
              name: 'Song Title',
              text: '{{song_title}}',
              fontSize: 60,
              fontFamily: 'Inter Bold',
              fill: '#a78bfa',
            },
            {
              id: 'explicit-badge',
              type: 'rect',
              x: 100,
              y: 520,
              width: 140,
              height: 60,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.8,
              visible: true,
              locked: false,
              name: 'Explicit Badge Bg',
              fill: '#ffffff',
            },
            {
              id: 'explicit-text',
              type: 'text',
              x: 115,
              y: 538,
              width: 110,
              height: 30,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Explicit Badge Text',
              text: 'ADVISORY',
              fontSize: 16,
              fontFamily: 'Inter Black',
              fill: '#000000',
            }
          ],
          variables: [
            {
              id: 'artist_name',
              name: 'Nome Artista',
              type: 'text',
              defaultValue: 'SFERA FOGGIA',
              placeholder: 'Inserisci nome artista...',
            },
            {
              id: 'song_title',
              name: 'Titolo Canzone',
              type: 'text',
              defaultValue: 'TUTTO PASSA (PROD. VELOX)',
              placeholder: 'Inserisci titolo canzone...',
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'Music',
          tags: ['music', 'rap', 'trap', 'cover', 'complete'],
        },
        {
          id: 'gaming-template',
          name: 'Template Gaming',
          description: 'High energy layout for gameplay videos and live streams',
          type: 'complete',
          objects: [
            {
              id: 'gaming-bg',
              type: 'rect',
              x: 0,
              y: 0,
              width: 1280,
              height: 720,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Background',
              fill: '#1e1b4b',
            },
            {
              id: 'badge-glow',
              type: 'rect',
              x: 100,
              y: 100,
              width: 250,
              height: 50,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 0.8,
              visible: true,
              locked: false,
              name: 'Badge Glow',
              fill: '#f59e0b',
            },
            {
              id: 'stream-badge-text',
              type: 'text',
              x: 120,
              y: 112,
              width: 210,
              height: 30,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Badge Text',
              text: 'LIVE GAMEPLAY',
              fontSize: 20,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
            },
            {
              id: 'game-title',
              type: 'text',
              x: 100,
              y: 180,
              width: 1080,
              height: 180,
              rotation: -3,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Game Name',
              text: '{{game_name}}',
              fontSize: 90,
              fontFamily: 'Inter Black',
              fill: '#f59e0b',
              textShadow: {
                offsetX: 6,
                offsetY: 6,
                blur: 0,
                color: '#000000',
              },
            },
            {
              id: 'versus-text',
              type: 'text',
              x: 100,
              y: 380,
              width: 1080,
              height: 120,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              visible: true,
              locked: false,
              name: 'Versus Details',
              text: '{{versus_details}}',
              fontSize: 48,
              fontFamily: 'Inter Black',
              fill: '#ffffff',
              textShadow: {
                offsetX: 4,
                offsetY: 4,
                blur: 8,
                color: '#000000',
              },
            }
          ],
          variables: [
            {
              id: 'game_name',
              name: 'Nome Gioco / Callout',
              type: 'text',
              defaultValue: 'WARZONE V2',
              placeholder: 'E.g., GTA VI, WARZONE...',
            },
            {
              id: 'versus_details',
              name: 'Descrizione / Versus',
              type: 'text',
              defaultValue: '1v4 SQUAD WIPE CHALLENGE',
              placeholder: 'E.g., SOLO vs SQUAD...',
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: 'Gaming',
          tags: ['gaming', 'stream', 'gameplay', 'complete'],
        }
      ],
      
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