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

// ----------------------------------------------------------------
// Scratch canvas pool: the READ canvas (image → ImageData) and the
// feather MASK canvas are used synchronously — getImageData already
// copies the bytes — so they can be recycled immediately. The OUTPUT
// canvas is NOT pooled: callers (useImagePipeline → ImageRenderer)
// hold the returned canvas across frames, so pooling it would let two
// images paint into the same surface.
// ----------------------------------------------------------------
const scratchCanvases: (HTMLCanvasElement | OffscreenCanvas)[] = [];

export function acquireScratchCanvas(): HTMLCanvasElement | OffscreenCanvas {
  return scratchCanvases.pop() ?? (
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : document.createElement('canvas')
  );
}

export function releaseScratchCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
  // Cap the pool: thumbnails are 1920x1080, a handful of slots covers
  // realistic per-frame usage without pinning unbounded memory.
  if (scratchCanvases.length < 4) scratchCanvases.push(canvas);
}

export class ImageFilterProcessor {
  private scratch: HTMLCanvasElement | OffscreenCanvas;
  private scratchCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private worker: Worker | null = null;
  private pendingJobs: Map<string, { resolve: (data: ImageData) => void, reject: (err: Error) => void }> = new Map();
  private jobIdCounter = 0;

  constructor() {
    this.scratch = acquireScratchCanvas();
    this.scratchCtx = this.scratch.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
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

    // Size the pooled scratch canvas and draw the source into it.
    this.scratch.width = width;
    this.scratch.height = height;
    this.scratchCtx.drawImage(image, 0, 0, width, height);

    // If no filters to apply, return immediately
    if (!this.hasFilters(options)) {
      return this.getResultCanvas(width, height);
    }

    // getImageData COPIES the pixels, so the scratch surface can go
    // straight back into the pool — it is never referenced after this
    // point (the worker result is putImageData'd into the OUTPUT canvas
    // below, not into the scratch).
    const imageData = this.scratchCtx.getImageData(0, 0, width, height);
    releaseScratchCanvas(this.scratch);
    const jobId = `job_${this.jobIdCounter++}`;

    return new Promise((resolve, reject) => {
      this.pendingJobs.set(jobId, {
        resolve: (processedData: ImageData) => {
          // Fresh scratch for the result blit (the previous one may already
          // be recycled); then copy into a caller-owned output canvas.
          const outScratch = acquireScratchCanvas();
          const outScratchCtx = outScratch.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
          outScratch.width = width;
          outScratch.height = height;
          outScratchCtx.putImageData(processedData, 0, 0);
          const out = this.getResultCanvas(width, height, outScratch);
          releaseScratchCanvas(outScratch);
          resolve(out);
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

  /** Caller-owned (never pooled) output canvas, copied from `source`. */
  private getResultCanvas(
    width: number,
    height: number,
    source: HTMLCanvasElement | OffscreenCanvas = this.scratch,
  ): HTMLCanvasElement {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.drawImage(source, 0, 0);
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

// Single public entry point: every production caller (useImagePipeline)
// applies the whole option set at once so the image crosses to the filter
// worker exactly once. Per-filter wrappers (applyBlur, applyHSL, ...) were
// removed with the panels that consumed them.
export async function applyAllFilters(
  image: HTMLImageElement | HTMLCanvasElement,
  options: FilterOptions
): Promise<HTMLCanvasElement> {
  return imageFilterProcessor.applyFilters(image, options);
}