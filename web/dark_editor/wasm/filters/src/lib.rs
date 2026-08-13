//! Velox editor image core.
//!
//! Public WASM entry points (everything else is internal):
//! - `apply_pipeline`: the single-image filter chain (pixelation, blur,
//!   sharpen, HSL, brightness/contrast, vignette, noise, curves).
//! - `blend_layers`: two-image compositing (blend modes + source-over alpha).
//! - `process_mask`: apply an (optionally feathered) alpha mask to an image.

mod blend;
mod blur;
mod color;
mod curves;
mod mask;
mod noise;
mod pipeline;
mod pixelate;
mod sharpen;
mod simd;

use std::cell::RefCell;

use wasm_bindgen::prelude::*;

#[inline]
pub(crate) fn clamp(value: f64) -> u8 {
    // Uint8Array assignment in the previous JS implementation truncates
    // positive fractional values; keep that observable behavior.
    value.trunc().clamp(0.0, 255.0) as u8
}

// Reusable scratch buffers shared by the blur/sharpen/mask passes so the
// per-image temporary allocation happens only when the buffer needs to grow.
// The module is single-threaded WASM, so a thread_local is a plain global.
thread_local! {
    static SCRATCH: RefCell<Vec<u8>> = RefCell::new(Vec::new());
    static SCRATCH2: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}

#[inline]
pub(crate) fn with_scratch(len: usize, f: impl FnOnce(&mut [u8])) {
    SCRATCH.with(|cell| {
        let mut buf = cell.borrow_mut();
        buf.resize(len, 0);
        f(buf.as_mut_slice());
    });
}

#[inline]
pub(crate) fn with_scratch2(len: usize, f: impl FnOnce(&mut [u8])) {
    SCRATCH2.with(|cell| {
        let mut buf = cell.borrow_mut();
        buf.resize(len, 0);
        f(buf.as_mut_slice());
    });
}

// Configuration for a single apply_pipeline call. Field values are normalized
// by the worker before being passed in (0 / NaN-safe defaults).
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PipelineConfig {
    /// Pixelation block size; <= 0 disables.
    pub pixelation: f64,
    /// Box blur radius; <= 0 disables.
    pub blur: f64,
    /// Sharpen amount; <= 0 disables.
    pub sharpen: f64,
    /// HSL adjustment; all zero disables.
    pub hue: f64,
    pub saturation: f64,
    pub lightness: f64,
    /// Brightness/contrast; both zero disables.
    pub brightness: f64,
    pub contrast: f64,
    /// Vignette; radius <= 0 disables.
    pub vignette_radius: f64,
    pub vignette_softness: f64,
    /// Noise; intensity <= 0 disables.
    pub noise_intensity: f64,
    pub noise_seed: f64,
}

#[wasm_bindgen]
impl PipelineConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PipelineConfig {
        PipelineConfig {
            pixelation: 0.0,
            blur: 0.0,
            sharpen: 0.0,
            hue: 0.0,
            saturation: 0.0,
            lightness: 0.0,
            brightness: 0.0,
            contrast: 0.0,
            vignette_radius: 0.0,
            vignette_softness: 50.0,
            noise_intensity: 0.0,
            noise_seed: 1.0,
        }
    }
}

#[wasm_bindgen]
pub fn apply_pipeline(
    data: &mut [u8],
    width: u32,
    height: u32,
    config: PipelineConfig,
    curve_r: &[u8],
    curve_g: &[u8],
    curve_b: &[u8],
) {
    pipeline::apply_pipeline(data, width, height, config, curve_r, curve_g, curve_b);
}

#[wasm_bindgen]
pub fn blend_layers(base: &mut [u8], overlay: &[u8], width: u32, height: u32, mode: u32) {
    if width == 0 || height == 0 { return; }
    let mut count = (width as usize).saturating_mul(height as usize).saturating_mul(4);
    count = count.min(base.len()).min(overlay.len());
    // Keep the loop aligned to 4-byte RGBA pixels: partial trailing bytes
    // would make the per-pixel reads go out of bounds.
    count -= count % 4;
    blend::composite(base, overlay, count, mode);
}

#[wasm_bindgen]
pub fn process_mask(data: &mut [u8], mask: &[u8], width: u32, height: u32, feather: f64) {
    mask::process(data, mask, width as usize, height as usize, feather as usize);
}
