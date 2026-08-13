// Web Worker for Image Filtering
// Offloads heavy WASM calculations from the main thread

import initWasm, {
  apply_pipeline,
  PipelineConfig,
} from '../wasm/pkg/wasm_filters.js';
import type { FilterOptions } from '../imageFilters';

// Empty curve tables disable the curves stage inside the pipeline.
const NO_CURVES = new Uint8Array(0);

let wasmInitialized: Promise<void> | null = null;

async function ensureWasm() {
  if (!wasmInitialized) {
    wasmInitialized = initWasm().then(() => undefined);
  }
  return wasmInitialized;
}

self.onmessage = async (e: MessageEvent) => {
  const { jobId, imageData, width, height, options } = e.data as {
    jobId: string;
    imageData: ImageData;
    width: number;
    height: number;
    options: FilterOptions;
  };

  try {
    await ensureWasm();

    // Data must be passed as an array to match signature, 
    // or cast appropriately if we alter the rust binding
    const data = new Uint8Array(imageData.data.buffer);

    // Single WASM crossing: build the whole filter config and let Rust run
    // every enabled filter inside one call (pixelation, blur, sharpen, HSL,
    // brightness/contrast, vignette, noise, curves) instead of one crossing
    // per filter.
    const config = new PipelineConfig();
    config.pixelation = options.pixelation || 0;
    config.blur = options.blur || 0;
    config.sharpen = options.sharpen || 0;
    config.hue = options.hue || 0;
    config.saturation = options.saturation || 0;
    config.lightness = options.lightness || 0;
    config.brightness = options.brightness || 0;
    config.contrast = options.contrast || 0;
    if (options.vignetteRadius !== undefined && options.vignetteRadius > 0) {
      config.vignette_radius = options.vignetteRadius;
      config.vignette_softness = options.vignetteSoftness || 50;
    }
    if (options.noiseIntensity !== undefined && options.noiseIntensity > 0) {
      config.noise_intensity = options.noiseIntensity;
      config.noise_seed = options.noiseSeed || Date.now();
    }

    apply_pipeline(
      data,
      width,
      height,
      config,
      options.curveR || NO_CURVES,
      options.curveG || NO_CURVES,
      options.curveB || NO_CURVES
    );

    // Pass the buffer back as transferable to avoid copy overhead
    const outImageData = new ImageData(new Uint8ClampedArray(data.buffer), width, height);
    self.postMessage(
      { jobId, success: true, imageData: outImageData },
      { transfer: [outImageData.data.buffer] }
    );
  } catch (error) {
    self.postMessage({ jobId, success: false, error: (error as Error).message });
  }
};
