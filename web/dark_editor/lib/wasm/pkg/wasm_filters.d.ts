/* tslint:disable */
/* eslint-disable */

export function wasm_apply_blur(data: Uint8Array, width: number, height: number, radius: number): void;

export function wasm_apply_brightness_contrast(data: Uint8Array, brightness: number, contrast: number): void;

export function wasm_apply_curves(data: Uint8Array, curve_r: Uint8Array, curve_g: Uint8Array, curve_b: Uint8Array): void;

export function wasm_apply_hsl(data: Uint8Array, hue: number, saturation: number, lightness: number): void;

export function wasm_apply_noise(data: Uint8Array, intensity: number, seed: number): void;

export function wasm_apply_pixelation(data: Uint8Array, width: number, height: number, size: number): void;

export function wasm_apply_sharpen(data: Uint8Array, width: number, height: number, amount: number): void;

export function wasm_apply_vignette(data: Uint8Array, width: number, height: number, radius: number, softness: number): void;

export function wasm_blend_layers(base: Uint8Array, overlay: Uint8Array, width: number, height: number, mode: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly wasm_apply_blur: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
    readonly wasm_apply_brightness_contrast: (a: number, b: number, c: any, d: number, e: number) => void;
    readonly wasm_apply_curves: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly wasm_apply_hsl: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
    readonly wasm_apply_noise: (a: number, b: number, c: any, d: number, e: number) => void;
    readonly wasm_apply_pixelation: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
    readonly wasm_apply_sharpen: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
    readonly wasm_apply_vignette: (a: number, b: number, c: any, d: number, e: number, f: number, g: number) => void;
    readonly wasm_blend_layers: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
