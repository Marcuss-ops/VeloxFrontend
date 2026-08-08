// Preview vs Export Pipeline
// Manages different quality levels for editing preview vs final export

export type QualityLevel = 'preview' | 'high' | 'export';

export interface PipelineConfig {
  preview: {
    maxWidth: number;
    maxHeight: number;
    quality: number;  // 0-1
    useProxy: boolean;
  };
  high: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    useProxy: boolean;
  };
  export: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    useProxy: boolean;
  };
}

export const DEFAULT_CONFIG: PipelineConfig = {
  // Preview: fast, low resolution for real-time editing
  preview: {
    maxWidth: 640,
    maxHeight: 360,
    quality: 0.7,
    useProxy: true,
  },
  // High: better quality for detailed editing
  high: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 0.85,
    useProxy: true,
  },
  // Export: full resolution for final output
  export: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 1.0,
    useProxy: false,
  },
};

export class PreviewExportPipeline {
  private config: PipelineConfig;
  private proxyCache: Map<string, {
    original: HTMLImageElement | HTMLCanvasElement;
    proxy: HTMLCanvasElement;
    scale: number;
  }> = new Map();

  constructor(config: PipelineConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  // Get appropriate quality settings
  getQualitySettings(level: QualityLevel) {
    return this.config[level];
  }

  // Create a proxy (downscaled version) for editing
  createProxy(
    image: HTMLImageElement | HTMLCanvasElement,
    imageId: string,
    level: QualityLevel = 'preview'
  ): HTMLCanvasElement {
    const settings = this.config[level];
    const { naturalWidth, naturalHeight } = this.getImageDimensions(image);
    
    // Calculate scale to fit within max dimensions
    let scale = 1;
    if (naturalWidth > settings.maxWidth || naturalHeight > settings.maxHeight) {
      scale = Math.min(
        settings.maxWidth / naturalWidth,
        settings.maxHeight / naturalHeight
      );
    }

    // Check if we already have a cached proxy
    const cached = this.proxyCache.get(imageId);
    if (cached && Math.abs(cached.scale - scale) < 0.01) {
      return cached.proxy;
    }

    // Create proxy canvas
    const proxyWidth = Math.round(naturalWidth * scale);
    const proxyHeight = Math.round(naturalHeight * scale);
    
    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = proxyWidth;
    proxyCanvas.height = proxyHeight;
    
    const ctx = proxyCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = level === 'preview' ? 'medium' : 'high';
    ctx.drawImage(image, 0, 0, proxyWidth, proxyHeight);

    // Cache the proxy
    this.proxyCache.set(imageId, {
      original: image,
      proxy: proxyCanvas,
      scale,
    });

    return proxyCanvas;
  }

  // Get proxy scale factor
  getProxyScale(imageId: string): number {
    const cached = this.proxyCache.get(imageId);
    return cached?.scale ?? 1;
  }

  // Transform coordinates from proxy space to original space
  transformToOriginal(
    imageId: string,
    coords: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } {
    const scale = 1 / this.getProxyScale(imageId);
    return {
      x: coords.x * scale,
      y: coords.y * scale,
      width: coords.width * scale,
      height: coords.height * scale,
    };
  }

  // Transform coordinates from original space to proxy space
  transformToProxy(
    imageId: string,
    coords: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number; width: number; height: number } {
    const scale = this.getProxyScale(imageId);
    return {
      x: coords.x * scale,
      y: coords.y * scale,
      width: coords.width * scale,
      height: coords.height * scale,
    };
  }

  // Apply filter at appropriate quality level
  async applyFilterWithQuality(
    image: HTMLImageElement | HTMLCanvasElement,
    imageId: string,
    filterFn: (img: HTMLCanvasElement) => Promise<HTMLCanvasElement>,
    level: QualityLevel = 'preview'
  ): Promise<HTMLCanvasElement> {
    const settings = this.config[level];
    
    if (settings.useProxy) {
      const proxy = this.createProxy(image, imageId, level);
      return filterFn(proxy);
    } else {
      // Full resolution for export
      const canvas = document.createElement('canvas');
      const { naturalWidth, naturalHeight } = this.getImageDimensions(image);
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      return filterFn(canvas);
    }
  }

  // Get original image dimensions
  private getImageDimensions(image: HTMLImageElement | HTMLCanvasElement): { naturalWidth: number; naturalHeight: number } {
    if (image instanceof HTMLImageElement) {
      return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    } else {
      return { naturalWidth: image.width, naturalHeight: image.height };
    }
  }

  // Clear proxy cache
  clearCache(imageId?: string): void {
    if (imageId) {
      this.proxyCache.delete(imageId);
    } else {
      this.proxyCache.clear();
    }
  }

  // Get cache statistics
  getCacheStats(): { entries: number; imageIds: string[] } {
    return {
      entries: this.proxyCache.size,
      imageIds: Array.from(this.proxyCache.keys()),
    };
  }

  // Update config
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const previewExportPipeline = new PreviewExportPipeline();

// Helper function to determine quality level based on context
export function determineQualityLevel(context: 'editing' | 'preview' | 'export'): QualityLevel {
  switch (context) {
    case 'editing':
      return 'preview';
    case 'preview':
      return 'high';
    case 'export':
      return 'export';
    default:
      return 'preview';
  }
}