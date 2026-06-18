export default function initWasm(): Promise<{ initialized: boolean }>;

export function wasm_blend_layers(
  baseBuffer: Uint8Array | Uint8ClampedArray,
  overlayBuffer: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  blendModeIndex?: number
): void;

export function wasm_apply_brightness_contrast(
  data: Uint8Array | Uint8ClampedArray,
  brightness: number,
  contrast: number
): void;

export function wasm_apply_hsl(
  data: Uint8Array | Uint8ClampedArray,
  h: number,
  s: number,
  l: number
): void;

export function wasm_apply_pixelation(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  size: number
): void;

export function wasm_apply_blur(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): void;

export function wasm_apply_sharpen(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  amount: number
): void;

export function wasm_apply_vignette(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  softness: number
): void;

export function wasm_apply_noise(
  data: Uint8Array | Uint8ClampedArray,
  intensity: number,
  seed: number
): void;

export function wasm_apply_curves(
  data: Uint8Array | Uint8ClampedArray,
  curveR: number[] | Uint8Array,
  curveG: number[] | Uint8Array,
  curveB: number[] | Uint8Array
): void;

export class GpuFilterContext {
  static create(): Promise<GpuFilterContext>;
  apply_blur(
    data: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    radius: number
  ): Promise<Uint8Array>;
}

export function __wasmFiltersInitialized(): boolean;
