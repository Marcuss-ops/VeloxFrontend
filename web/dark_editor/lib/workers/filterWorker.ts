// Web Worker for Image Filtering
// Offloads heavy WASM calculations from the main thread

import initWasm, { 
  wasm_apply_blur, 
  wasm_apply_sharpen, 
  wasm_apply_pixelation, 
  wasm_apply_hsl,
  wasm_apply_brightness_contrast,
  wasm_apply_vignette,
  wasm_apply_noise,
  wasm_apply_curves,
  wasm_blend_layers,
  GpuFilterContext 
} from '../wasm/wasm_filters.js';
import type { FilterOptions } from '../imageFilters';

let wasmInitialized: Promise<void> | null = null;
let gpuContext: GpuFilterContext | null = null;

async function ensureWasm() {
  if (!wasmInitialized) {
    wasmInitialized = initWasm().then(async () => {
      try {
        gpuContext = await GpuFilterContext.create();
        console.log("WebGPU Filter Context initialized successfully.");
      } catch (err) {
        console.warn("WebGPU not available, falling back to CPU Wasm filters.", err);
      }
    });
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
    let data = new Uint8Array(imageData.data.buffer);

    if (options.pixelation && options.pixelation > 0) {
      wasm_apply_pixelation(data as any, width, height, options.pixelation);
    }
    
    if (options.blur && options.blur > 0) {
      if (gpuContext) {
        // Run on GPU
        try {
          const blurredData = await gpuContext.apply_blur(data as any, width, height, options.blur);
          data = new Uint8Array(blurredData.buffer as ArrayBuffer);
        } catch (e) {
          console.warn("GPU Blur failed, falling back to CPU.", e);
          wasm_apply_blur(data as any, width, height, options.blur);
        }
      } else {
        // Run on CPU
        wasm_apply_blur(data as any, width, height, options.blur);
      }
    }
    
    if (options.sharpen && options.sharpen > 0) {
      wasm_apply_sharpen(data as any, width, height, options.sharpen);
    }

    // NEW: HSL adjustment
    if (options.hue !== undefined || options.saturation !== undefined || options.lightness !== undefined) {
      wasm_apply_hsl(
        data as any, 
        options.hue || 0, 
        options.saturation || 0, 
        options.lightness || 0
      );
    }

    // NEW: Brightness & Contrast
    if (options.brightness !== undefined || options.contrast !== undefined) {
      wasm_apply_brightness_contrast(
        data as any, 
        options.brightness || 0, 
        options.contrast || 0
      );
    }

    // NEW: Vignette
    if (options.vignetteRadius !== undefined && options.vignetteRadius > 0) {
      wasm_apply_vignette(
        data as any, 
        width, 
        height, 
        options.vignetteRadius, 
        options.vignetteSoftness || 50
      );
    }

    // NEW: Noise/Grain
    if (options.noiseIntensity !== undefined && options.noiseIntensity > 0) {
      wasm_apply_noise(
        data as any, 
        options.noiseIntensity, 
        options.noiseSeed || Date.now()
      );
    }

    // NEW: Color Curves
    if (options.curveR && options.curveG && options.curveB) {
      wasm_apply_curves(
        data as any, 
        options.curveR, 
        options.curveG, 
        options.curveB
      );
    }

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
