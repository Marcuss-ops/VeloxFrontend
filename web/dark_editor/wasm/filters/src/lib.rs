mod blend;

use std::cell::RefCell;

use wasm_bindgen::prelude::*;

#[inline]
pub(crate) fn clamp(value: f64) -> u8 {
    // Uint8Array assignment in the previous JS implementation truncates
    // positive fractional values; keep that observable behavior.
    value.trunc().clamp(0.0, 255.0) as u8
}

#[wasm_bindgen]
pub fn wasm_blend_layers(base: &mut [u8], overlay: &[u8], width: u32, height: u32, mode: u32) {
    if width == 0 || height == 0 { return; }
    let mut count = (width as usize).saturating_mul(height as usize).saturating_mul(4);
    count = count.min(base.len()).min(overlay.len());
    // Keep the loop aligned to 4-byte RGBA pixels: partial trailing bytes
    // would make the per-pixel reads go out of bounds.
    count -= count % 4;
    blend::composite(base, overlay, count, mode);
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
    let w = width as usize; let h = height as usize;
    if radius == 0 || w == 0 || h == 0 { return; }
    if data.len() < w.saturating_mul(h).saturating_mul(4) { return; }
    // Clamping preserves exact results (a window already spans the whole
    // image once r >= max(w, h)) and keeps x + r + 1 overflow-free.
    let r = (radius as usize).min(w.max(h));
    with_scratch(data.len(), |temp| {
        // Horizontal pass with a sliding window: each step costs O(1) (add
        // the pixel entering the window, drop the one leaving) instead of
        // re-summing 2r+1 pixels per output pixel, so the pass is O(w*h)
        // independent of the radius.
        for y in 0..h {
            let base = y * w;
            let seed = (r + 1).min(w);
            let mut sums = [0u32; 4];
            for x in 0..seed {
                let i = (base + x) * 4;
                for c in 0..4 { sums[c] += data[i + c] as u32; }
            }
            let mut count = seed as u32;
            for x in 0..w {
                let i = (base + x) * 4;
                for c in 0..4 { temp[i + c] = (sums[c] / count) as u8; }
                let enter = x + r + 1;
                if enter < w {
                    let ie = (base + enter) * 4;
                    for c in 0..4 { sums[c] += data[ie + c] as u32; }
                    count += 1;
                }
                if x >= r {
                    let il = (base + x - r) * 4;
                    for c in 0..4 { sums[c] -= data[il + c] as u32; }
                    count -= 1;
                }
            }
        }
        // Vertical pass, same sliding-window trick per column.
        for x in 0..w {
            let seed = (r + 1).min(h);
            let mut sums = [0u32; 4];
            for y in 0..seed {
                let i = (y * w + x) * 4;
                for c in 0..4 { sums[c] += temp[i + c] as u32; }
            }
            let mut count = seed as u32;
            for y in 0..h {
                let i = (y * w + x) * 4;
                for c in 0..4 { data[i + c] = (sums[c] / count) as u8; }
                let enter = y + r + 1;
                if enter < h {
                    let ie = (enter * w + x) * 4;
                    for c in 0..4 { sums[c] += temp[ie + c] as u32; }
                    count += 1;
                }
                if y >= r {
                    let il = ((y - r) * w + x) * 4;
                    for c in 0..4 { sums[c] -= temp[il + c] as u32; }
                    count -= 1;
                }
            }
        }
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

    // Reference implementation: the pre-sliding-window algorithm, kept to
    // prove the rewrite is byte-identical and to benchmark against.
    fn blur_naive(data: &mut [u8], width: usize, height: usize, r: usize) {
        if r == 0 || width == 0 || height == 0 { return; }
        let mut temp = vec![0u8; data.len()];
        for y in 0..height { for x in 0..width {
            let mut sums = [0u32; 4]; let mut count = 0u32;
            for dx in x.saturating_sub(r)..=(x + r).min(width - 1) { let i = (y * width + dx) * 4; if i + 3 < data.len() { for c in 0..4 { sums[c] += data[i+c] as u32; } count += 1; } }
            let i = (y * width + x) * 4; if i + 3 < temp.len() { for c in 0..4 { temp[i+c] = (sums[c] / count) as u8; } }
        }}
        for x in 0..width { for y in 0..height {
            let mut sums = [0u32; 4]; let mut count = 0u32;
            for dy in y.saturating_sub(r)..=(y + r).min(height - 1) { let i = (dy * width + x) * 4; if i + 3 < temp.len() { for c in 0..4 { sums[c] += temp[i+c] as u32; } count += 1; } }
            let i = (y * width + x) * 4; if i + 3 < data.len() { for c in 0..4 { data[i+c] = (sums[c] / count) as u8; } }
        }}
    }

    fn fill_test_image(len: usize, mut state: u32) -> Vec<u8> {
        let mut v = Vec::with_capacity(len);
        for _ in 0..len {
            state ^= state << 13; state ^= state >> 17; state ^= state << 5;
            v.push((state >> 8) as u8);
        }
        v
    }

    #[test]
    fn sliding_blur_matches_naive() {
        for &(w, h) in &[(1usize, 1usize), (2, 3), (3, 3), (5, 4), (17, 9), (64, 48)] {
            for &r in &[0u32, 1, 2, 4, 7, 100] {
                let data = fill_test_image(w * h * 4, 0xC0FFEE ^ (w as u32) ^ (h as u32) ^ r);
                let mut expected = data.clone();
                blur_naive(&mut expected, w, h, r as usize);
                let mut actual = data.clone();
                wasm_apply_blur(&mut actual, w as u32, h as u32, r);
                assert_eq!(actual, expected, "blur mismatch at {w}x{h} r={r}");
            }
        }
    }

    // On-demand benchmark: cargo test --release blur_benchmark -- --ignored --nocapture
    #[test]
    #[ignore = "manual: cargo test --release blur_benchmark -- --ignored --nocapture"]
    fn blur_benchmark() {
        use std::time::{Duration, Instant};
        let cases: &[(usize, usize)] = &[(320, 240), (1280, 720), (1920, 1080)];
        for &(w, h) in cases {
            let data = fill_test_image(w * h * 4, 0x5EED);
            for &r in &[2u32, 8, 32, 100] {
                let mut naive_min = Duration::MAX;
                let mut slide_min = Duration::MAX;
                for _ in 0..3 {
                    let mut buf = data.clone();
                    let t = Instant::now();
                    blur_naive(&mut buf, w, h, r as usize);
                    naive_min = naive_min.min(t.elapsed());

                    let mut buf = data.clone();
                    let t = Instant::now();
                    wasm_apply_blur(&mut buf, w as u32, h as u32, r);
                    slide_min = slide_min.min(t.elapsed());
                }
                assert_eq!(blur_naive_check(&data, w, h, r), blur_sliding_check(&data, w, h, r));
                let speedup = naive_min.as_secs_f64() / slide_min.as_secs_f64().max(1e-9);
                println!("blur {w}x{h} r={r:>3}: naive {:>10.3?}  sliding {:>10.3?}  speedup {speedup:.2}x",
                    naive_min, slide_min);
            }
        }
    }

    // Helpers that return the blurred buffer instead of mutating, for the
    // benchmark equality assertion above.
    fn blur_naive_check(data: &[u8], w: usize, h: usize, r: u32) -> Vec<u8> {
        let mut out = data.to_vec();
        blur_naive(&mut out, w, h, r as usize);
        out
    }

    fn blur_sliding_check(data: &[u8], w: usize, h: usize, r: u32) -> Vec<u8> {
        let mut out = data.to_vec();
        wasm_apply_blur(&mut out, w as u32, h as u32, r);
        out
    }
}
