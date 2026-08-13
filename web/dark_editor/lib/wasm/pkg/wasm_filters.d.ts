/* tslint:disable */
/* eslint-disable */

export class PipelineConfig {
    free(): void;
    [Symbol.dispose](): void;
    constructor();
    /**
     * Box blur radius; <= 0 disables.
     */
    blur: number;
    /**
     * Brightness/contrast; both zero disables.
     */
    brightness: number;
    contrast: number;
    /**
     * HSL adjustment; all zero disables.
     */
    hue: number;
    lightness: number;
    /**
     * Noise; intensity <= 0 disables.
     */
    noise_intensity: number;
    noise_seed: number;
    /**
     * Pixelation block size; <= 0 disables.
     */
    pixelation: number;
    saturation: number;
    /**
     * Sharpen amount; <= 0 disables.
     */
    sharpen: number;
    /**
     * Vignette; radius <= 0 disables.
     */
    vignette_radius: number;
    vignette_softness: number;
}

export function apply_pipeline(data: Uint8Array, width: number, height: number, config: PipelineConfig, curve_r: Uint8Array, curve_g: Uint8Array, curve_b: Uint8Array): void;

export function blend_layers(base: Uint8Array, overlay: Uint8Array, width: number, height: number, mode: number): void;

export function process_mask(data: Uint8Array, mask: Uint8Array, width: number, height: number, feather: number): void;

export function wasm_hsl_scalar(data: Uint8Array, hue: number, saturation: number, lightness: number): void;

export function wasm_hsl_simd(data: Uint8Array, hue: number, saturation: number, lightness: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_pipelineconfig_blur: (a: number) => number;
    readonly __wbg_get_pipelineconfig_brightness: (a: number) => number;
    readonly __wbg_get_pipelineconfig_contrast: (a: number) => number;
    readonly __wbg_get_pipelineconfig_hue: (a: number) => number;
    readonly __wbg_get_pipelineconfig_lightness: (a: number) => number;
    readonly __wbg_get_pipelineconfig_noise_intensity: (a: number) => number;
    readonly __wbg_get_pipelineconfig_noise_seed: (a: number) => number;
    readonly __wbg_get_pipelineconfig_pixelation: (a: number) => number;
    readonly __wbg_get_pipelineconfig_saturation: (a: number) => number;
    readonly __wbg_get_pipelineconfig_sharpen: (a: number) => number;
    readonly __wbg_get_pipelineconfig_vignette_radius: (a: number) => number;
    readonly __wbg_get_pipelineconfig_vignette_softness: (a: number) => number;
    readonly __wbg_pipelineconfig_free: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_blur: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_brightness: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_contrast: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_hue: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_lightness: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_noise_intensity: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_noise_seed: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_pixelation: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_saturation: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_sharpen: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_vignette_radius: (a: number, b: number) => void;
    readonly __wbg_set_pipelineconfig_vignette_softness: (a: number, b: number) => void;
    readonly apply_pipeline: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => void;
    readonly blend_layers: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number) => void;
    readonly pipelineconfig_new: () => number;
    readonly process_mask: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasm_hsl_scalar: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
    readonly wasm_hsl_simd: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
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
