import { describe, expect, it } from 'vitest';
import {
  EDITOR_COMPATIBILITY_BASE_PATH,
  editorApiPath,
  editorAssetPath,
  editorProjectContextPath,
  editorRuntimePath,
} from '@/lib/editor-runtime';

describe('editor runtime URL helpers', () => {
  it('keeps the compatibility boundary centralized', () => {
    expect(editorRuntimePath('editor/ve_project')).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/editor/ve_project`);
    expect(editorRuntimePath('/editor/ve_project')).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/editor/ve_project`);
    expect(editorRuntimePath(`${EDITOR_COMPATIBILITY_BASE_PATH}/editor/ve_project`)).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/editor/ve_project`);
  });

  it('builds API and asset paths without duplicating the boundary', () => {
    expect(editorApiPath('projects/ve_project')).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/api/projects/ve_project`);
    expect(editorApiPath('/api/projects/ve_project')).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/api/projects/ve_project`);
    expect(editorAssetPath('temp/image.png')).toBe(`${EDITOR_COMPATIBILITY_BASE_PATH}/temp/image.png`);
  });

  it('escapes the opaque project id in the authorized context endpoint', () => {
    expect(editorProjectContextPath('ve_project/with spaces')).toBe(
      `${EDITOR_COMPATIBILITY_BASE_PATH}/api/v1/youtube/editor-sessions/by-project/ve_project%2Fwith%20spaces`,
    );
  });

  it('passes absolute URLs through unchanged', () => {
    expect(editorRuntimePath('https://editor.example.test/editor/ve_project')).toBe('https://editor.example.test/editor/ve_project');
  });
});
