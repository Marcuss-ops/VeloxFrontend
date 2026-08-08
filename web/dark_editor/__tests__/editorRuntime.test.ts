import { afterEach, describe, expect, it } from 'vitest';
import {
  EDITOR_COMPATIBILITY_BASE_PATH,
  INSTAEDIT_APP_URL,
  editorApiPath,
  editorAssetPath,
  editorProjectContextPath,
  editorReturnToPath,
  editorReturnToUrl,
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

  describe('return-to helpers', () => {
    // The dark_editor vitest suite runs in a Node environment (no jsdom),
    // so the helpers must be tested against an injected fake window.
    const fakeWindow = (search: string): void => {
      (globalThis as { window?: unknown }).window = {
        location: { search },
      };
    };

    afterEach(() => {
      delete (globalThis as { window?: unknown }).window;
    });

    it('reads the relative return_to stamped on the launch URL', () => {
      fakeWindow('?return_to=%2Fapp%2Fcovers%3Fgroup%3D7');
      expect(editorReturnToPath()).toBe('/app/covers?group=7');
      expect(editorReturnToUrl()).toBe(`${INSTAEDIT_APP_URL}/app/covers?group=7`);
    });

    it('falls back to the Copertine hub when no return context is present', () => {
      fakeWindow('');
      expect(editorReturnToPath()).toBe('/app/covers');
      expect(editorReturnToUrl()).toBe(`${INSTAEDIT_APP_URL}/app/covers`);
    });

    it('rejects absolute / protocol-relative return_to values', () => {
      fakeWindow('?return_to=https%3A%2F%2Fevil.example%2Fphish');
      expect(editorReturnToPath()).toBe('/app/covers');
      fakeWindow('?return_to=%2F%2Fevil.example%2Fphish');
      expect(editorReturnToPath()).toBe('/app/covers');
    });
  });
});
