// @vitest-environment jsdom
//
// Protection network for the preview-vs-export quality pipeline
// (lib/previewExportPipeline). Pins the behaviors that must survive any
// refactor of the export quality layer:
//   - the three quality tiers (preview/high/export) and their defaults
//   - quality-level selection by context
//   - proxy downscaling math and per-image caching
//   - coordinate transforms between proxy and original space
//   - config merging and cache lifecycle
//
// jsdom has no canvas implementation, so `document.createElement('canvas')`
// is stubbed with a minimal 2d-context stand-in.

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_CONFIG,
    PreviewExportPipeline,
    determineQualityLevel,
} from '@/lib/previewExportPipeline';

const originalCreateElement = document.createElement.bind(document);

function stubCanvasElement() {
    const ctx = {
        imageSmoothingEnabled: true,
        imageSmoothingQuality: '',
        drawImage: vi.fn(),
    };
    const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ctx),
    };
    return canvas;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('previewExportPipeline', () => {
    it('exposes the three quality tiers with stable defaults', () => {
        expect(DEFAULT_CONFIG.preview).toEqual({ maxWidth: 640, maxHeight: 360, quality: 0.7, useProxy: true });
        expect(DEFAULT_CONFIG.high).toEqual({ maxWidth: 1280, maxHeight: 720, quality: 0.85, useProxy: true });
        expect(DEFAULT_CONFIG.export).toEqual({ maxWidth: 4096, maxHeight: 4096, quality: 1.0, useProxy: false });
    });

    it('maps editing/preview/export contexts to quality levels', () => {
        expect(determineQualityLevel('editing')).toBe('preview');
        expect(determineQualityLevel('preview')).toBe('high');
        expect(determineQualityLevel('export')).toBe('export');
        expect(determineQualityLevel('unknown' as never)).toBe('preview');
    });

    it('getQualitySettings returns the config for the requested level', () => {
        const pipeline = new PreviewExportPipeline();
        expect(pipeline.getQualitySettings('export')).toBe(DEFAULT_CONFIG.export);
        expect(pipeline.getQualitySettings('high').maxWidth).toBe(1280);
    });

    it('createProxy downscales oversized images to the level limits', () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
            if (tag === 'canvas') return stubCanvasElement() as unknown as HTMLElement;
            return originalCreateElement(tag, options);
        });

        const pipeline = new PreviewExportPipeline();
        const proxy = pipeline.createProxy({ width: 1920, height: 1080 }, 'img-1', 'preview');

        // 1920x1080 → fit within 640x360 (scale = 640/1920)
        expect(proxy.width).toBe(640);
        expect(proxy.height).toBe(360);
        expect(pipeline.getProxyScale('img-1')).toBeCloseTo(640 / 1920, 5);
    });

    it('createProxy keeps small images at full resolution', () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
            if (tag === 'canvas') return stubCanvasElement() as unknown as HTMLElement;
            return originalCreateElement(tag, options);
        });

        const pipeline = new PreviewExportPipeline();
        const proxy = pipeline.createProxy({ width: 320, height: 180 }, 'img-small', 'preview');

        expect(proxy.width).toBe(320);
        expect(proxy.height).toBe(180);
        expect(pipeline.getProxyScale('img-small')).toBe(1);
    });

    it('caches the proxy per image id and reuses it for the same scale', () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
            if (tag === 'canvas') return stubCanvasElement() as unknown as HTMLElement;
            return originalCreateElement(tag, options);
        });

        const pipeline = new PreviewExportPipeline();
        const first = pipeline.createProxy({ width: 1920, height: 1080 }, 'img-1', 'preview');
        const second = pipeline.createProxy({ width: 1920, height: 1080 }, 'img-1', 'preview');

        expect(second).toBe(first);
        expect(pipeline.getCacheStats().entries).toBe(1);
    });

    it('transforms coordinates between proxy and original space', () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
            if (tag === 'canvas') return stubCanvasElement() as unknown as HTMLElement;
            return originalCreateElement(tag, options);
        });

        const pipeline = new PreviewExportPipeline();
        pipeline.createProxy({ width: 1920, height: 1080 }, 'img-1', 'preview');

        const proxyCoords = pipeline.transformToProxy('img-1', { x: 100, y: 100, width: 200, height: 100 });
        expect(proxyCoords.x).toBeCloseTo(100 * (640 / 1920), 5);
        expect(proxyCoords.width).toBeCloseTo(200 * (640 / 1920), 5);

        const originalCoords = pipeline.transformToOriginal('img-1', proxyCoords);
        expect(originalCoords.x).toBeCloseTo(100, 5);
        expect(originalCoords.width).toBeCloseTo(200, 5);
    });

    it('updateConfig merges partial config over the defaults', () => {
        const pipeline = new PreviewExportPipeline();
        pipeline.updateConfig({ export: { maxWidth: 8192, maxHeight: 8192, quality: 1, useProxy: false } });

        expect(pipeline.getQualitySettings('export').maxWidth).toBe(8192);
        // untouched tiers keep their defaults
        expect(pipeline.getQualitySettings('preview')).toEqual(DEFAULT_CONFIG.preview);
    });

    it('clearCache removes entries selectively or fully', () => {
        vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
            if (tag === 'canvas') return stubCanvasElement() as unknown as HTMLElement;
            return originalCreateElement(tag, options);
        });

        const pipeline = new PreviewExportPipeline();
        pipeline.createProxy({ width: 1920, height: 1080 }, 'a', 'preview');
        pipeline.createProxy({ width: 1280, height: 720 }, 'b', 'preview');

        pipeline.clearCache('a');
        expect(pipeline.getCacheStats().imageIds).toEqual(['b']);
        expect(pipeline.getProxyScale('a')).toBe(1);

        pipeline.clearCache();
        expect(pipeline.getCacheStats().entries).toBe(0);
    });
});
