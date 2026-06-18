export type EditorTemplate = {
  id: string;
  name: string;
  createdAt: string;
  canvas: {
    objects: unknown[];
    canvasWidth: number;
    canvasHeight: number;
  };
};

const KEY = 'dark_editor_templates_v1';

export function loadTemplates(): EditorTemplate[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EditorTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: EditorTemplate[]) {
  window.localStorage.setItem(KEY, JSON.stringify(templates));
}

export function addTemplate(template: EditorTemplate) {
  const templates = loadTemplates();
  saveTemplates([template, ...templates]);
}

export function deleteTemplate(id: string) {
  const templates = loadTemplates();
  saveTemplates(templates.filter((t) => t.id !== id));
}

