// Layer Compositor
// Handles layer blending and compositing using WASM

import initWasm, { wasm_blend_layers } from './wasm/wasm_filters.js';

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
];

export const BLEND_MODE_MAP: Record<BlendMode, number> = {
  'normal': 0,
  'multiply': 1,
  'screen': 2,
  'overlay': 3,
  'darken': 4,
  'lighten': 5,
  'color-dodge': 6,
  'color-burn': 7,
  'hard-light': 8,
  'soft-light': 9,
  'difference': 10,
  'exclusion': 11,
};

export interface LayerData {
  id: string;
  imageData: Uint8Array;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompositeResult {
  imageData: ImageData;
  width: number;
  height: number;
}

let wasmInitialized: Promise<unknown> | null = null;

async function ensureWasm(): Promise<void> {
  if (!wasmInitialized) {
    wasmInitialized = initWasm();
  }
  await wasmInitialized;
}

export class LayerCompositor {
  private width: number;
  private height: number;
  private baseBuffer: Uint8Array | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // Initialize base layer (background)
  initBase(color: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }): void {
    this.baseBuffer = new Uint8Array(this.width * this.height * 4);
    for (let i = 0; i < this.baseBuffer.length; i += 4) {
      this.baseBuffer[i] = color.r;
      this.baseBuffer[i + 1] = color.g;
      this.baseBuffer[i + 2] = color.b;
      this.baseBuffer[i + 3] = color.a;
    }
  }

  // Composite multiple layers
  async compositeLayers(layers: LayerData[]): Promise<CompositeResult> {
    await ensureWasm();

    // Initialize base if not set
    if (!this.baseBuffer) {
      this.initBase();
    }

    // Sort layers by order (bottom to top)
    const sortedLayers = [...layers].filter(l => l.visible).reverse();

    // Start with base buffer
    let currentBuffer = new Uint8Array(this.baseBuffer!);

    // Composite each layer
    for (const layer of sortedLayers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      // Create overlay buffer at canvas size
      const overlayBuffer = new Uint8Array(this.width * this.height * 4);
      
      // Copy layer data to correct position
      this.copyLayerToBuffer(layer, overlayBuffer);

      // Apply opacity
      if (layer.opacity < 1) {
        this.applyOpacity(overlayBuffer, layer.opacity);
      }

      // Blend using WASM
      const blendModeIndex = BLEND_MODE_MAP[layer.blendMode] ?? 0;
      wasm_blend_layers(
        currentBuffer,
        overlayBuffer,
        this.width,
        this.height,
        blendModeIndex
      );
    }

    // Convert to ImageData
    const imageData = new ImageData(
      new Uint8ClampedArray(currentBuffer.buffer),
      this.width,
      this.height
    );

    return {
      imageData,
      width: this.width,
      height: this.height,
    };
  }

  // Blend two layers
  async blendLayers(
    base: ImageData,
    overlay: ImageData,
    blendMode: BlendMode
  ): Promise<ImageData> {
    await ensureWasm();

    if (base.width !== overlay.width || base.height !== overlay.height) {
      throw new Error('Layer dimensions must match');
    }

    const baseBuffer = new Uint8Array(base.data.buffer);
    const overlayBuffer = new Uint8Array(overlay.data.buffer);
    const blendModeIndex = BLEND_MODE_MAP[blendMode];

    wasm_blend_layers(
      baseBuffer,
      overlayBuffer,
      base.width,
      base.height,
      blendModeIndex
    );

    return new ImageData(
      new Uint8ClampedArray(baseBuffer.buffer),
      base.width,
      base.height
    );
  }

  // Flatten layers to single canvas
  async flattenToCanvas(layers: LayerData[]): Promise<HTMLCanvasElement> {
    const result = await this.compositeLayers(layers);
    
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(result.imageData, 0, 0);
    
    return canvas;
  }

  // Copy layer data to position in buffer
  private copyLayerToBuffer(layer: LayerData, buffer: Uint8Array): void {
    const startX = Math.max(0, Math.floor(layer.x));
    const startY = Math.max(0, Math.floor(layer.y));
    const endX = Math.min(this.width, Math.floor(layer.x + layer.width));
    const endY = Math.min(this.height, Math.floor(layer.y + layer.height));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const layerX = x - Math.floor(layer.x);
        const layerY = y - Math.floor(layer.y);
        
        if (layerX < 0 || layerX >= layer.width || layerY < 0 || layerY >= layer.height) {
          continue;
        }

        const bufferIdx = (y * this.width + x) * 4;
        const layerIdx = (layerY * layer.width + layerX) * 4;

        if (layerIdx + 3 < layer.imageData.length) {
          buffer[bufferIdx] = layer.imageData[layerIdx];
          buffer[bufferIdx + 1] = layer.imageData[layerIdx + 1];
          buffer[bufferIdx + 2] = layer.imageData[layerIdx + 2];
          buffer[bufferIdx + 3] = layer.imageData[layerIdx + 3];
        }
      }
    }
  }

  // Apply opacity to buffer
  private applyOpacity(buffer: Uint8Array, opacity: number): void {
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i + 3] = Math.round(buffer[i + 3] * opacity);
    }
  }

  // Resize compositor
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.baseBuffer = null;
  }

  // Get dimensions
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

// Helper to extract ImageData from canvas/image
export function extractImageData(source: HTMLImageElement | HTMLCanvasElement): ImageData {
  const canvas = document.createElement('canvas');
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  
  return ctx.getImageData(0, 0, width, height);
}

// Helper to create LayerData from image
export function createLayerFromImage(
  id: string,
  image: HTMLImageElement | HTMLCanvasElement,
  options: Partial<Omit<LayerData, 'id' | 'imageData' | 'width' | 'height'>> = {}
): LayerData {
  const imageData = extractImageData(image);
  
  return {
    id,
    imageData: new Uint8Array(imageData.data.buffer),
    width: imageData.width,
    height: imageData.height,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    ...options,
  };
}