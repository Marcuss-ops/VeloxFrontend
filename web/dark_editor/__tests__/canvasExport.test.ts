import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCanvasToBlob, getCanvasElement } from '@/lib/canvasExport';

describe('canvasExport', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  describe('getCanvasElement', () => {
    it('returns null when document is not available', () => {
      (globalThis as any).document = undefined;
      expect(getCanvasElement()).toBeNull();
    });

    it('returns null when no canvas matches the selector', () => {
      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(null),
      };
      expect(getCanvasElement()).toBeNull();
    });

    it('returns the matched canvas element', () => {
      const canvas = { toBlob: vi.fn() } as unknown as HTMLCanvasElement;
      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(canvas),
      };
      expect(getCanvasElement()).toBe(canvas);
    });
  });

  describe('exportCanvasToBlob', () => {
    it('resolves to null when no canvas is found', async () => {
      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(null),
      };
      const result = await exportCanvasToBlob('png', 90);
      expect(result).toBeNull();
    });

    it('returns a blob with the correct MIME type for png', async () => {
      const blob = new Blob(['pngdata'], { type: 'image/png' });
      const canvas = {
        toBlob: vi.fn((cb: BlobCallback, mime: string) => {
          expect(mime).toBe('image/png');
          cb(blob as unknown as Blob);
        }),
      } as unknown as HTMLCanvasElement;

      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(canvas),
      };

      const result = await exportCanvasToBlob('png', 90);
      expect(result).toEqual({ blob, mime: 'image/png' });
    });

    it('returns a blob with the correct MIME type and quality for jpeg', async () => {
      const blob = new Blob(['jpegdata'], { type: 'image/jpeg' });
      const canvas = {
        toBlob: vi.fn((cb: BlobCallback, mime: string, quality?: number) => {
          expect(mime).toBe('image/jpeg');
          expect(quality).toBe(0.9);
          cb(blob as unknown as Blob);
        }),
      } as unknown as HTMLCanvasElement;

      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(canvas),
      };

      const result = await exportCanvasToBlob('jpeg', 90);
      expect(result).toEqual({ blob, mime: 'image/jpeg' });
    });

    it('clamps quality between 0.01 and 1', async () => {
      const canvas = {
        toBlob: vi.fn((cb: BlobCallback, _mime: string, quality?: number) => {
          expect(quality).toBe(0.01);
          cb(new Blob(['x']) as unknown as Blob);
        }),
      } as unknown as HTMLCanvasElement;

      (globalThis as any).document = {
        querySelector: vi.fn().mockReturnValue(canvas),
      };

      await exportCanvasToBlob('jpeg', 0);
      expect(canvas.toBlob).toHaveBeenCalled();
    });
  });
});
