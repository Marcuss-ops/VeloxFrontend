import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { addTemplate, deleteTemplate, loadTemplates, type EditorTemplate } from '@/lib/templates';

export interface UseEditorTemplatesReturn {
  templates: EditorTemplate[];
  newTemplateName: string;
  setNewTemplateName: (name: string) => void;
  handleSaveTemplate: () => void;
  handleApplyTemplate: (template: EditorTemplate) => void;
  handleDeleteTemplate: (id: string) => void;
}

export function useEditorTemplates(): UseEditorTemplatesReturn {
  const { objects, canvasWidth, canvasHeight, loadObjects, setCanvasSize } = useEditorStore();
  const { currentProject, setDirty } = useProjectStore();
  const { addToast } = useUIStore();

  const [templates, setTemplates] = useState<EditorTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const handleSaveTemplate = useCallback(() => {
    const name =
      newTemplateName.trim() ||
      `${currentProject?.name || 'Template'} ${new Date().toLocaleString()}`;

    const template: EditorTemplate = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      canvas: { objects, canvasWidth, canvasHeight },
    };

    addTemplate(template);
    setTemplates(loadTemplates());
    setNewTemplateName('');
    addToast({ type: 'success', message: 'Template saved' });
  }, [canvasHeight, canvasWidth, currentProject?.name, newTemplateName, objects, addToast]);

  const handleApplyTemplate = useCallback(
    (template: EditorTemplate) => {
      loadObjects(template.canvas.objects as Parameters<typeof loadObjects>[0]);
      setCanvasSize(template.canvas.canvasWidth, template.canvas.canvasHeight);
      setDirty(true);
      addToast({ type: 'success', message: `Applied template: ${template.name}` });
    },
    [loadObjects, setCanvasSize, setDirty, addToast]
  );

  const handleDeleteTemplate = useCallback((id: string) => {
    deleteTemplate(id);
    setTemplates(loadTemplates());
  }, []);

  return {
    templates,
    newTemplateName,
    setNewTemplateName,
    handleSaveTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
  };
}
