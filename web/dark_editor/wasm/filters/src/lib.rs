use std::cell::RefCell;

use wasm_bindgen::prelude::*;

#[inline]
fn clamp(value: f64) -> u8 {
    // Uint8Array assignment in the previous JS implementation truncates
    // positive fractional values; keep that observable behavior.
    value.trunc().clamp(0.0, 255.0) as u8
}

#[inline]
fn blend_channel(base: f64, overlay: f64, mode: u32) -> f64 {
    let b = base / 255.0;
    let o = overlay / 255.0;
    match mode {
        1 => b * o,
        2 => 1.0 - (1.0 - b) * (1.0 - o),
        3 => if b < 0.5 { 2.0 * b * o } else { 1.0 - 2.0 * (1.0 - b) * (1.0 - o) },
        4 => b.min(o),
        5 => b.max(o),
        6 => if o >= 1.0 { 1.0 } else { (b / (1.0 - o)).min(1.0) },
        7 => if o <= 0.0 { 0.0 } else { 1.0 - ((1.0 - b) / o).min(1.0) },
        8 => if o < 0.5 { 2.0 * b * o } else { 1.0 - 2.0 * (1.0 - b) * (1.0 - o) },
        9 => (1.0 - 2.0 * o) * b * b + 2.0 * o * b,
        10 => (b - o).abs(),
        11 => b + o - 2.0 * b * o,
        _ => o,
    }
}

#[wasm_bindgen]
pub fn wasm_blend_layers(base: &mut [u8], overlay: &[u8], width: u32, height: u32, mode: u32) {
    if width == 0 || height == 0 { return; }
    let count = (width as usize).saturating_mul(height as usize).saturating_mul(4);
    let count = count.min(base.len()).min(overlay.len());
    for i in (0..count).step_by(4) {
        let base_a = base[i + 3] as f64 / 255.0;
        let over_a = overlay[i + 3] as f64 / 255.0;
        let out_a = over_a + base_a * (1.0 - over_a);
        if out_a <= 0.0 {
            base[i..i + 4].fill(0);
            continue;
        }
        let src_weight = over_a;
        let dst_weight = base_a * (1.0 - over_a);
        let old = [base[i], base[i + 1], base[i + 2]];
        for c in 0..3 {
            let blended = blend_channel(old[c] as f64, overlay[i + c] as f64, mode);
            base[i + c] = clamp(((blended * src_weight) + (old[c] as f64 / 255.0) * dst_weight) / out_a * 255.0);
        }
        base[i + 3] = clamp(out_a * 255.0);
    }
}

#[wasm_bindgen]
pub fn wasm_apply_brightness_contrast(data: &mut [u8], brightness: f64, contrast: f64) {
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    for px in data.chunks_exact_mut(4) {
        for channel in px.iter_mut().take(3) {
            *channel = clamp(factor * (*channel as f64 + brightness - 128.0) + 128.0);
        }
    }
}

#[inline]
fn hue_to_rgb(p: f64, q: f64, mut t: f64) -> f64 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { p + (q - p) * 6.0 * t }
    else if t < 0.5 { q }
    else if t < 2.0 / 3.0 { p + (q - p) * (2.0 / 3.0 - t) * 6.0 }
    else { p }
}

#[wasm_bindgen]
pub fn wasm_apply_hsl(data: &mut [u8], hue: f64, saturation: f64, lightness: f64) {
    for px in data.chunks_exact_mut(4) {
        let (r, g, b) = (px[0] as f64 / 255.0, px[1] as f64 / 255.0, px[2] as f64 / 255.0);
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let mut h = 0.0;
        let mut s = 0.0;
        let mut l = (max + min) / 2.0;
        let d = max - min;
        if d != 0.0 {
            s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
            h = if max == r { (g - b) / d + if g < b { 6.0 } else { 0.0 } }
                else if max == g { (b - r) / d + 2.0 }
                else { (r - g) / d + 4.0 };
            h /= 6.0;
        }
        h = (h + hue / 360.0).rem_euclid(1.0);
        let sm = 1.0 + saturation / 100.0;
        s = if sm >= 1.0 { s + (1.0 - s) * (sm - 1.0) } else { s * sm }.clamp(0.0, 1.0);
        let ls = lightness / 100.0;
        l = if ls > 0.0 { l + (1.0 - l) * ls } else { l * (1.0 + ls) }.clamp(0.0, 1.0);
        let (nr, ng, nb) = if s == 0.0 { (l, l, l) } else {
            let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
            let p = 2.0 * l - q;
            (hue_to_rgb(p, q, h + 1.0 / 3.0), hue_to_rgb(p, q, h), hue_to_rgb(p, q, h - 1.0 / 3.0))
        };
        px[0] = clamp(nr * 255.0); px[1] = clamp(ng * 255.0); px[2] = clamp(nb * 255.0);
    }
}

#[wasm_bindgen]
pub fn wasm_apply_pixelation(data: &mut [u8], width: u32, height: u32, size: u32) {
    if size <= 1 || width == 0 || height == 0 { return; }
    let w = width as usize; let h = height as usize; let size = size as usize;
    for y in (0..h).step_by(size) {
        for x in (0..w).step_by(size) {
            let source = (y * w + x) * 4;
            if source + 3 >= data.len() { continue; }
            let pixel = [data[source], data[source + 1], data[source + 2], data[source + 3]];
            for py in y..(y + size).min(h) {
                for px in x..(x + size).min(w) {
                    let i = (py * w + px) * 4;
                    if i + 3 < data.len() { data[i..i + 4].copy_from_slice(&pixel); }
                }
            }
        }
    }
}

// Reusable scratch buffer shared by the blur and sharpen passes so the
// per-image temporary allocation happens only when the buffer needs to grow.
// The module is single-threaded WASM, so a thread_local is a plain global.
thread_local! {
    static SCRATCH: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}

#[inline]
fn with_scratch(len: usize, f: impl FnOnce(&mut [u8])) {
    SCRATCH.with(|cell| {
        let mut buf = cell.borrow_mut();
        buf.resize(len, 0);
        f(buf.as_mut_slice());
    });
}

#[wasm_bindgen]
pub fn wasm_apply_blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
    let w = width as usize; let h = height as usize; let r = radius as usize;
    if r == 0 || w == 0 || h == 0 { return; }
    with_scratch(data.len(), |temp| {
        for y in 0..h { for x in 0..w {
            let mut sums = [0u32; 4]; let mut count = 0u32;
            for dx in x.saturating_sub(r)..=(x + r).min(w - 1) { let i = (y * w + dx) * 4; if i + 3 < data.len() { for c in 0..4 { sums[c] += data[i+c] as u32; } count += 1; } }
            let i = (y * w + x) * 4; if i + 3 < temp.len() { for c in 0..4 { temp[i+c] = (sums[c] / count) as u8; } }
        }}
        for x in 0..w { for y in 0..h {
            let mut sums = [0u32; 4]; let mut count = 0u32;
            for dy in y.saturating_sub(r)..=(y + r).min(h - 1) { let i = (dy * w + x) * 4; if i + 3 < temp.len() { for c in 0..4 { sums[c] += temp[i+c] as u32; } count += 1; } }
            let i = (y * w + x) * 4; if i + 3 < data.len() { for c in 0..4 { data[i+c] = (sums[c] / count) as u8; } }
        }}
    });
}

#[wasm_bindgen]
pub fn wasm_apply_sharpen(data: &mut [u8], width: u32, height: u32, amount: f64) {
    let w = width as usize; let h = height as usize;
    if w < 3 || h < 3 { return; }
    with_scratch(data.len(), |temp| {
        temp.copy_from_slice(data);
        for y in 1..h-1 { for x in 1..w-1 { let i = (y*w+x)*4;
            for c in 0..3 { let val=temp[i+c] as f64; let up=temp[((y-1)*w+x)*4+c] as f64; let down=temp[((y+1)*w+x)*4+c] as f64; let left=temp[(y*w+x-1)*4+c] as f64; let right=temp[(y*w+x+1)*4+c] as f64; let lap=val*5.0-(up+down+left+right); data[i+c]=clamp(val+(lap-val)*amount); }
        }}
    });
}

#[wasm_bindgen]
pub fn wasm_apply_vignette(data: &mut [u8], width: u32, height: u32, radius: f64, softness: f64) {
    let w=width as usize; let h=height as usize; let cx=width as f64/2.0; let cy=height as f64/2.0; let max_dist=(cx*cx+cy*cy).sqrt(); let limit=radius/100.0*max_dist; let soft=softness/100.0;
    for y in 0..h { for x in 0..w { let dx=x as f64-cx; let dy=y as f64-cy; let dist=(dx*dx+dy*dy).sqrt(); if dist > limit*(1.0-soft) { let factor=1.0-((dist-limit*(1.0-soft))/(limit*soft).max(1.0)).min(1.0); let i=(y*w+x)*4; if i+2<data.len() { for c in 0..3 { data[i+c]=clamp(data[i+c] as f64*factor); } } } }}
}

// Deterministic hash of the f64 seed into a nonzero u32 PRNG state. The
// splitmix32 finalizer decorrelates seeds that differ by small amounts (e.g.
// Date.now() values one millisecond apart) so nearby seeds still produce
// unrelated noise streams.
#[inline]
fn noise_seed_state(seed: f64) -> u32 {
    let bits = seed.to_bits();
    let mut z = (bits ^ (bits >> 32)) as u32;
    z = z.wrapping_mul(0x9E37_79B9);
    z ^= z >> 16;
    z = z.wrapping_mul(0x85EB_CA6B);
    z ^= z >> 13;
    z = z.wrapping_mul(0xC2B2_AE35);
    z ^= z >> 16;
    if z == 0 { 0x9E37_79B9 } else { z }
}

// xorshift32: cheap deterministic PRNG, far cheaper than sin() per pixel.
struct Xorshift32 { state: u32 }

impl Xorshift32 {
    #[inline]
    fn new(seed: u32) -> Self { Xorshift32 { state: seed } }

    #[inline]
    fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    /// Uniform in [0, 1) using the top 24 bits.
    #[inline]
    fn next_unit(&mut self) -> f64 {
        (self.next_u32() >> 8) as f64 / 16_777_216.0
    }
}

#[wasm_bindgen]
pub fn wasm_apply_noise(data: &mut [u8], intensity: f64, seed: f64) {
    let factor = intensity / 100.0 * 255.0;
    if factor == 0.0 { return; }
    let mut rng = Xorshift32::new(noise_seed_state(seed));
    for px in data.chunks_exact_mut(4) {
        let noise = (rng.next_unit() - 0.5) * factor;
        for c in px.iter_mut().take(3) { *c = clamp(*c as f64 + noise); }
    }
}

#[wasm_bindgen]
pub fn wasm_apply_curves(data: &mut [u8], curve_r: &[u8], curve_g: &[u8], curve_b: &[u8]) {
    for px in data.chunks_exact_mut(4) { if curve_r.len()>px[0] as usize { px[0]=curve_r[px[0] as usize]; } if curve_g.len()>px[1] as usize { px[1]=curve_g[px[1] as usize]; } if curve_b.len()>px[2] as usize { px[2]=curve_b[px[2] as usize]; } }
}

// Single-entry pipeline: the worker sends the image into WASM once and every
// enabled filter runs here, in the same order the worker previously applied
// them with separate per-filter crossings.
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
pub fn wasm_apply_pipeline(
    data: &mut [u8],
    width: u32,
    height: u32,
    config: PipelineConfig,
    curve_r: &[u8],
    curve_g: &[u8],
    curve_b: &[u8],
) {
    if config.pixelation > 0.0 {
        wasm_apply_pixelation(data, width, height, config.pixelation as u32);
    }
    if config.blur > 0.0 {
        wasm_apply_blur(data, width, height, config.blur as u32);
    }
    if config.sharpen > 0.0 {
        wasm_apply_sharpen(data, width, height, config.sharpen);
    }
    if config.hue != 0.0 || config.saturation != 0.0 || config.lightness != 0.0 {
        wasm_apply_hsl(data, config.hue, config.saturation, config.lightness);
    }
    if config.brightness != 0.0 || config.contrast != 0.0 {
        wasm_apply_brightness_contrast(data, config.brightness, config.contrast);
    }
    if config.vignette_radius > 0.0 {
        wasm_apply_vignette(data, width, height, config.vignette_radius, config.vignette_softness);
    }
    if config.noise_intensity > 0.0 {
        wasm_apply_noise(data, config.noise_intensity, config.noise_seed);
    }
    // Empty slices mean "no curves", matching the worker's previous
    // `curveR && curveG && curveB` guard (wasm_apply_curves no-ops on empty).
    if !curve_r.is_empty() && !curve_g.is_empty() && !curve_b.is_empty() {
        wasm_apply_curves(data, curve_r, curve_g, curve_b);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn pixelation_copies_the_block_origin() { let mut data=vec![10,20,30,255, 40,50,60,255, 70,80,90,255, 1,2,3,255]; wasm_apply_pixelation(&mut data,2,2,2); assert_eq!(&data[4..8], &[10,20,30,255]); assert_eq!(&data[8..12], &[10,20,30,255]); }
    #[test] fn curves_are_deterministic() { let mut data=vec![1,2,3,255]; let c: Vec<u8>=(0..=255).rev().collect(); wasm_apply_curves(&mut data,&c,&c,&c); assert_eq!(&data[..3], &[254,253,252]); }
    #[test] fn pipeline_disabled_is_a_noop() {
        let mut data = vec![10,20,30,255, 40,50,60,255, 70,80,90,255, 1,2,3,255];
        let original = data.clone();
        let no_curves: [u8; 0] = [];
        wasm_apply_pipeline(&mut data, 2, 2, PipelineConfig::new(), &no_curves, &no_curves, &no_curves);
        assert_eq!(data, original);
    }
    #[test] fn pipeline_matches_sequential_filter_calls() {
        let mut data = vec![
            10,20,30,255, 200,180,160,255, 50,60,70,255,
            90,100,110,255, 15,25,35,255, 240,230,220,255,
            120,130,140,255, 5,15,25,255, 210,200,190,255,
        ];
        let mut expected = data.clone();
        wasm_apply_pixelation(&mut expected, 3, 3, 2);
        wasm_apply_blur(&mut expected, 3, 3, 1);
        wasm_apply_sharpen(&mut expected, 3, 3, 0.5);
        wasm_apply_hsl(&mut expected, 10.0, 5.0, -5.0);
        wasm_apply_brightness_contrast(&mut expected, 8.0, 10.0);
        wasm_apply_vignette(&mut expected, 3, 3, 40.0, 50.0);
        wasm_apply_noise(&mut expected, 10.0, 42.0);
        let c: Vec<u8> = (0u8..=255).map(|v| v.wrapping_add(2)).collect();
        wasm_apply_curves(&mut expected, &c, &c, &c);

        let config = PipelineConfig {
            pixelation: 2.0,
            blur: 1.0,
            sharpen: 0.5,
            hue: 10.0,
            saturation: 5.0,
            lightness: -5.0,
            brightness: 8.0,
            contrast: 10.0,
            vignette_radius: 40.0,
            vignette_softness: 50.0,
            noise_intensity: 10.0,
            noise_seed: 42.0,
        };
        wasm_apply_pipeline(&mut data, 3, 3, config, &c, &c, &c);
        assert_eq!(data, expected);
    }
    #[test] fn noise_is_deterministic_per_seed() {
        let mut a = vec![10,20,30,255, 40,50,60,255, 70,80,90,255];
        let mut b = a.clone();
        wasm_apply_noise(&mut a, 10.0, 42.0);
        wasm_apply_noise(&mut b, 10.0, 42.0);
        assert_eq!(a, b);
        let mut c = vec![10,20,30,255, 40,50,60,255, 70,80,90,255];
        wasm_apply_noise(&mut c, 10.0, 43.0);
        assert_ne!(a, c);
    }
    #[test] fn noise_changes_pixels() {
        let mut data = vec![100u8; 8 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        wasm_apply_noise(&mut data, 40.0, 7.0);
        assert_ne!(data, original);
    }
    #[test] fn blur_constant_image_is_unchanged() {
        let mut data = vec![100u8; 9 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        wasm_apply_blur(&mut data, 3, 3, 1);
        assert_eq!(data, original);
    }
    #[test] fn sharpen_constant_image_is_unchanged() {
        let mut data = vec![100u8; 9 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        wasm_apply_sharpen(&mut data, 3, 3, 0.8);
        assert_eq!(data, original);
    }
}
