import type { StateCreator } from 'zustand';
import type { Template, TemplateVariable, CanvasObject } from '../types';

/**
 * TemplateLibrarySlice owns the canonical templates list + every CRUD /
 * query / apply action that operates on it.  All actions share the same
 * `templates` state, so they live together in one slice (the thinker's
 * earlier verdict separated these as `library` + `selection` slices, but
 * `applyTemplate` / `batchApplyTemplate` both need read-access to
 * `templates`, so co-location is the simpler, less-fragile architecture).
 *
 * The 5 default templates (title-template, thumbnail-template,
 * telegiornale-template, rap-trap-template, gaming-template) are
 * embedded as initial state, mirroring the pre-refactor templateStore.ts.
 */

export interface TemplateLibrarySlice {
  templates: Template[];

  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;

  getTemplates: (type?: Template['type'], category?: string) => Template[];
  getTemplate: (id: string) => Template | undefined;

  applyTemplate: (id: string, variables?: Record<string, string | number>) => CanvasObject[];
  batchApplyTemplate: (
    templateId: string,
    dataSets: Record<string, string | number>[],
  ) => CanvasObject[][];

  searchTemplates: (query: string) => Template[];
  getTemplateCategories: () => string[];
  getTemplateTags: () => string[];
}

import type { TemplateStoreState } from './draft';

const NOW = () => Date.now();

/**
 * Replace `{{key}}` placeholders in a string.  Empty-string falsy values are
 * preserved (so a template can blank out a field by setting the variable to
 * the empty string).
 */
function substituteVariables(
  text: string,
  variables: Record<string, string | number>,
): string {
  let out = text;
  for (const [key, value] of Object.entries(variables)) {
    out = out.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return out;
}

/**
 * Build the immutable seed of default templates.  Centralised so the seed
 * can be reused by tests and reset actions.
 */
function buildDefaultTemplates(): Template[] {
  const t = NOW();

  return [
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
        },
      ],
      variables: [
        {
          id: 'title',
          name: 'Title Text',
          type: 'text',
          defaultValue: 'Your Title Here',
          placeholder: 'Enter your title...',
        },
      ],
      createdAt: t,
      updatedAt: t,
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
          textShadow: { offsetX: 4, offsetY: 4, blur: 8, color: '#000000' },
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
        },
      ],
      variables: [
        { id: 'title', name: 'Main Title', type: 'text', defaultValue: 'VIDEO TITLE', placeholder: 'Enter main title...' },
        { id: 'subtitle', name: 'Subtitle', type: 'text', defaultValue: 'Subtitle or description', placeholder: 'Enter subtitle...' },
        { id: 'bg_color', name: 'Background Color', type: 'color', defaultValue: '#ff0000' },
      ],
      createdAt: t,
      updatedAt: t,
      category: 'Video',
      tags: ['thumbnail', 'complete', 'dynamic'],
    },
    {
      id: 'telegiornale-template',
      name: 'Template Telegiornale',
      description: 'Breaking News layout with lower third banner',
      type: 'complete',
      objects: [
        { id: 'news-bg', type: 'rect', x: 0, y: 0, width: 1280, height: 720, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Background', fill: '#0f172a' },
        { id: 'red-header', type: 'rect', x: 50, y: 50, width: 320, height: 60, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Header Banner', fill: '#dc2626' },
        { id: 'header-text', type: 'text', x: 70, y: 60, width: 280, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Header Text', text: 'TELEGIORNALE', fontSize: 28, fontFamily: 'Inter Black', fill: '#ffffff' },
        { id: 'news-banner-bg', type: 'rect', x: 50, y: 500, width: 1180, height: 140, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.95, visible: true, locked: false, name: 'Lower Third Bar', fill: '#1e3a8a' },
        { id: 'news-banner-accent', type: 'rect', x: 50, y: 500, width: 150, height: 140, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Live Tag Accent', fill: '#dc2626' },
        { id: 'live-tag', type: 'text', x: 80, y: 545, width: 100, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Live Tag', text: 'LIVE', fontSize: 36, fontFamily: 'Inter Black', fill: '#ffffff' },
        { id: 'news-title', type: 'text', x: 230, y: 520, width: 950, height: 60, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Breaking News Title', text: '{{breaking_title}}', fontSize: 42, fontFamily: 'Inter Bold', fill: '#ffffff' },
        { id: 'news-ticker', type: 'text', x: 230, y: 585, width: 950, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false, name: 'Ticker Subtext', text: '{{ticker_text}}', fontSize: 22, fontFamily: 'Inter Medium', fill: '#fcd34d' },
      ],
      variables: [
        { id: 'breaking_title', name: 'Breaking News Title', type: 'text', defaultValue: 'ULTIMORA: NOTIZIA DEL GIORNO', placeholder: 'Inserisci titolo telegiornale...' },
        { id: 'ticker_text', name: 'Ticker Subtext', type: 'text', defaultValue: "Dettagli e aggiornamenti in tempo reale dall'inviato.", placeholder: 'Testo scorrevole inferiore...' },
      ],
      createdAt: t,
      updatedAt: t,
      category: 'News',
      tags: ['telegiornale', 'breaking-news', 'complete', 'dynamic'],
    },
    {
      id: 'rap-trap-template',
      name: 'Template Rap/Trap Cover',
      description: 'Dark neon theme for music singles and trap album covers',
      type: 'complete',
      objects: [
        { id: 'music-bg', type: 'rect', x: 0, y: 0, width: 1280, height: 720, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Background', fill: '#020205' },
        { id: 'artist-text', type: 'text', x: 100, y: 120, width: 1080, height: 180, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Artist Name', text: '{{artist_name}}', fontSize: 110, fontFamily: 'Inter Black', fill: '#ffffff', textShadow: { offsetX: 0, offsetY: 0, blur: 15, color: '#a78bfa' } },
        { id: 'song-text', type: 'text', x: 100, y: 320, width: 1080, height: 120, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.9, visible: true, locked: false, name: 'Song Title', text: '{{song_title}}', fontSize: 60, fontFamily: 'Inter Bold', fill: '#a78bfa' },
        { id: 'explicit-badge', type: 'rect', x: 100, y: 520, width: 140, height: 60, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false, name: 'Explicit Badge Bg', fill: '#ffffff' },
        { id: 'explicit-text', type: 'text', x: 115, y: 538, width: 110, height: 30, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Explicit Badge Text', text: 'ADVISORY', fontSize: 16, fontFamily: 'Inter Black', fill: '#000000' },
      ],
      variables: [
        { id: 'artist_name', name: 'Nome Artista', type: 'text', defaultValue: 'SFERA FOGGIA', placeholder: 'Inserisci nome artista...' },
        { id: 'song_title', name: 'Titolo Canzone', type: 'text', defaultValue: 'TUTTO PASSA (PROD. VELOX)', placeholder: 'Inserisci titolo canzone...' },
      ],
      createdAt: t,
      updatedAt: t,
      category: 'Music',
      tags: ['music', 'rap', 'trap', 'cover', 'complete'],
    },
    {
      id: 'gaming-template',
      name: 'Template Gaming',
      description: 'High energy layout for gameplay videos and live streams',
      type: 'complete',
      objects: [
        { id: 'gaming-bg', type: 'rect', x: 0, y: 0, width: 1280, height: 720, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Background', fill: '#1e1b4b' },
        { id: 'badge-glow', type: 'rect', x: 100, y: 100, width: 250, height: 50, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8, visible: true, locked: false, name: 'Badge Glow', fill: '#f59e0b' },
        { id: 'stream-badge-text', type: 'text', x: 120, y: 112, width: 210, height: 30, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Badge Text', text: 'LIVE GAMEPLAY', fontSize: 20, fontFamily: 'Inter Black', fill: '#ffffff' },
        { id: 'game-title', type: 'text', x: 100, y: 180, width: 1080, height: 180, rotation: -3, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Game Name', text: '{{game_name}}', fontSize: 90, fontFamily: 'Inter Black', fill: '#f59e0b', textShadow: { offsetX: 6, offsetY: 6, blur: 0, color: '#000000' } },
        { id: 'versus-text', type: 'text', x: 100, y: 380, width: 1080, height: 120, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, name: 'Versus Details', text: '{{versus_details}}', fontSize: 48, fontFamily: 'Inter Black', fill: '#ffffff', textShadow: { offsetX: 4, offsetY: 4, blur: 8, color: '#000000' } },
      ],
      variables: [
        { id: 'game_name', name: 'Nome Gioco / Callout', type: 'text', defaultValue: 'WARZONE V2', placeholder: 'E.g., GTA VI, WARZONE...' },
        { id: 'versus_details', name: 'Descrizione / Versus', type: 'text', defaultValue: '1v4 SQUAD WIPE CHALLENGE', placeholder: 'E.g., SOLO vs SQUAD...' },
      ],
      createdAt: t,
      updatedAt: t,
      category: 'Gaming',
      tags: ['gaming', 'stream', 'gameplay', 'complete'],
    },
  ];
}

export const DEFAULT_TEMPLATES: Template[] = buildDefaultTemplates();

export const createTemplateLibrarySlice: StateCreator<
  TemplateStoreState,
  [],
  [],
  TemplateLibrarySlice
> = (set, get) => ({
  templates: DEFAULT_TEMPLATES,

  addTemplate: (template) => {
    const newTemplate: Template = {
      ...template,
      id: NOW().toString(),
      createdAt: NOW(),
      updatedAt: NOW(),
    };
    set((state) => ({ templates: [...state.templates, newTemplate] }));
  },

  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((template) =>
        template.id === id
          ? { ...template, ...updates, updatedAt: NOW() }
          : template,
      ),
    }));
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== id),
    }));
  },

  getTemplates: (type, category) => {
    const { templates } = get();
    return templates
      .filter((template) => {
        if (type && template.type !== type) return false;
        if (category && template.category !== category) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getTemplate: (id) => {
    const { templates } = get();
    return templates.find((template) => template.id === id);
  },

  applyTemplate: (id, variables = {}) => {
    const template = get().getTemplate(id);
    if (!template) return [];

    return template.objects.map((obj) => {
      const cloned: CanvasObject = JSON.parse(JSON.stringify(obj));

      if (typeof cloned.text === 'string') {
        cloned.text = substituteVariables(cloned.text, variables);
      }
      if (typeof cloned.fill === 'string') {
        cloned.fill = substituteVariables(cloned.fill, variables);
      }

      return cloned;
    });
  },

  batchApplyTemplate: (templateId, dataSets) => {
    return dataSets.map((dataSet) => get().applyTemplate(templateId, dataSet));
  },

  searchTemplates: (query) => {
    const { templates } = get();
    const q = query.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(q) ||
        template.description?.toLowerCase().includes(q) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
        template.variables?.some((variable: TemplateVariable) =>
          variable.name.toLowerCase().includes(q),
        ),
    );
  },

  getTemplateCategories: () => {
    const { templates } = get();
    const categories = new Set(
      templates
        .map((t) => t.category)
        .filter((cat): cat is string => Boolean(cat)),
    );
    return Array.from(categories);
  },

  getTemplateTags: () => {
    const { templates } = get();
    const tags = new Set(templates.flatMap((t) => t.tags || []));
    return Array.from(tags);
  },
});