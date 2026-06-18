// Image Filter Utilities
// Handles blur, sharpen, pixelation and advanced effects via WASM

// FilterOptions is used to configure image effects
export interface FilterOptions {
  blur?: number;
  sharpen?: number;
  pixelation?: number;
  // HSL adjustment
  hue?: number;          // -180 to 180
  saturation?: number;   // -100 to 100
  lightness?: number;    // -100 to 100
  // Brightness & Contrast
  brightness?: number;   // -100 to 100
  contrast?: number;     // -100 to 100
  // Vignette
  vignetteRadius?: number;    // 0 to 100
  vignetteSoftness?: number;  // 0 to 100
  // Noise/Grain
  noiseIntensity?: number;    // 0 to 100
  noiseSeed?: number;         // Random seed
  // Color Curves
  curveR?: Uint8Array;  // 256 values
  curveG?: Uint8Array;  // 256 values
  curveB?: Uint8Array;  // 256 values
}

export class ImageFilterProcessor {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private worker: Worker | null = null;
  private pendingJobs: Map<string, { resolve: (data: ImageData) => void, reject: (err: any) => void }> = new Map();
  private jobIdCounter = 0;

  constructor() {
    // Try to use OffscreenCanvas for performance, fallback to regular canvas
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(1, 1);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    } else {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    }
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && !this.worker) {
      this.worker = new Worker(new URL('./workers/filterWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { jobId, success, imageData, error } = e.data;
    const job = this.pendingJobs.get(jobId);
    if (job) {
      if (success) {
        job.resolve(imageData);
      } else {
        job.reject(new Error(error));
      }
      this.pendingJobs.delete(jobId);
    }
  }

  // Check if any filters are applied
  private hasFilters(options: FilterOptions): boolean {
    return !!(
      options.blur || 
      options.sharpen || 
      options.pixelation ||
      options.hue !== undefined ||
      options.saturation !== undefined ||
      options.lightness !== undefined ||
      options.brightness !== undefined ||
      options.contrast !== undefined ||
      (options.vignetteRadius !== undefined && options.vignetteRadius > 0) ||
      (options.noiseIntensity !== undefined && options.noiseIntensity > 0) ||
      (options.curveR && options.curveG && options.curveB)
    );
  }

  // Apply filters via Web Worker
  async applyFilters(
    image: HTMLImageElement | HTMLCanvasElement,
    options: FilterOptions
  ): Promise<HTMLCanvasElement> {
    const { width, height } = this.getImageDimensions(image);
    
    // Set canvas size
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Draw original image to extract ImageData
    this.ctx.drawImage(image, 0, 0, width, height);
    
    // If no filters to apply, return immediately
    if (!this.hasFilters(options)) {
      return this.getResultCanvas(width, height);
    }

    const imageData = this.ctx.getImageData(0, 0, width, height);
    const jobId = `job_${this.jobIdCounter++}`;

    return new Promise((resolve, reject) => {
      this.pendingJobs.set(jobId, {
        resolve: (processedData: ImageData) => {
          this.ctx.putImageData(processedData, 0, 0);
          resolve(this.getResultCanvas(width, height));
        },
        reject
      });

      // Transfer the buffer to the worker (zero-copy transfer if possible)
      if (this.worker) {
        this.worker.postMessage(
          { jobId, imageData, width, height, options },
          [imageData.data.buffer]
        );
      } else {
        reject(new Error("Worker not initialized"));
      }
    });
  }

  private getResultCanvas(width: number, height: number): HTMLCanvasElement {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.drawImage(this.canvas as any, 0, 0);
    return outCanvas;
  }

  private getImageDimensions(image: HTMLImageElement | HTMLCanvasElement): { width: number; height: number } {
    if (image instanceof HTMLImageElement) {
      return { width: image.naturalWidth, height: image.naturalHeight };
    } else {
      return { width: image.width, height: image.height };
    }
  }
}

// Singleton instance
export const imageFilterProcessor = new ImageFilterProcessor();

// Convenience functions for basic filters
export async function applyBlur(image: HTMLImageElement | HTMLCanvasElement, radius: number): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { blur: radius });
}

export async function applySharpen(image: HTMLImageElement | HTMLCanvasElement, intensity: number): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { sharpen: intensity });
}

export async function applyPixelation(image: HTMLImageElement | HTMLCanvasElement, pixelSize: number): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { pixelation: pixelSize });
}

// Convenience functions for new filters
export async function applyHSL(
  image: HTMLImageElement | HTMLCanvasElement, 
  hue: number, 
  saturation: number, 
  lightness: number
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { hue, saturation, lightness });
}

export async function applyBrightnessContrast(
  image: HTMLImageElement | HTMLCanvasElement, 
  brightness: number, 
  contrast: number
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { brightness, contrast });
}

export async function applyVignette(
  image: HTMLImageElement | HTMLCanvasElement, 
  radius: number, 
  softness: number
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { vignetteRadius: radius, vignetteSoftness: softness });
}

export async function applyNoise(
  image: HTMLImageElement | HTMLCanvasElement, 
  intensity: number, 
  seed?: number
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { noiseIntensity: intensity, noiseSeed: seed });
}

export async function applyCurves(
  image: HTMLImageElement | HTMLCanvasElement, 
  curveR: Uint8Array, 
  curveG: Uint8Array, 
  curveB: Uint8Array
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, { curveR, curveG, curveB });
}

export async function applyAllFilters(
  image: HTMLImageElement | HTMLCanvasElement,
  options: FilterOptions
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, options);
}