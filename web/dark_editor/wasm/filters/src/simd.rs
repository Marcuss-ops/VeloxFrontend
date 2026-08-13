// SIMD (wasm simd128) implementations of the hot filters. On non-wasm
// targets (e.g. the host running `cargo test`) they delegate to the scalar
// implementations, since the simd128 intrinsics only exist on wasm32.
//
// `blur`, `sharpen` and `noise` are wired into apply_pipeline. Byte-identity
// vs the scalar reference: blur is integer-only (i32x4 channel sums) so it is
// exactly byte-identical; sharpen and noise convert the scalar f64 math to
// f32, so they may differ by a fraction of an LSB on a small number of
// pixels.
//
// `hsl` is still an evaluation-only variant: it is measured against the
// scalar reference by scripts/wasm-simd-eval.mjs (via the temporary
// wasm_hsl_scalar / wasm_hsl_simd exports) and is not yet wired into the
// pipeline.
#![allow(dead_code, unused_imports)]

#[cfg(not(target_arch = "wasm32"))]
mod imp {
    pub(crate) fn blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
        crate::blur::apply(data, width, height, radius);
    }
    pub(crate) fn sharpen(data: &mut [u8], width: u32, height: u32, amount: f64) {
        crate::sharpen::apply(data, width, height, amount);
    }
    pub(crate) fn noise(data: &mut [u8], intensity: f64, seed: f64) {
        crate::noise::apply(data, intensity, seed);
    }
    pub(crate) fn hsl(data: &mut [u8], hue: f64, saturation: f64, lightness: f64) {
        crate::color::apply_hsl(data, hue, saturation, lightness);
    }
}

#[cfg(target_arch = "wasm32")]
mod imp {
    use core::arch::wasm32::*;

    /// Load 4 u8 bytes and widen them to an i32x4 (one lane per channel).
    #[inline]
    unsafe fn load_u8x4_i32(p: *const u8) -> v128 {
        // v128_load32_zero reads exactly 4 bytes (little-endian) into lane 0;
        // widening through u16x8 gives one lane per channel.
        u32x4_extend_low_u16x8(u16x8_extend_low_u8x16(v128_load32_zero(p as *const u32)))
    }

    /// Load 4 u8 bytes and convert them to f32x4 (one lane per channel).
    #[inline]
    unsafe fn load_u8x4_f32(p: *const u8) -> v128 {
        f32x4_convert_i32x4(u32x4_extend_low_u16x8(u16x8_extend_low_u8x16(v128_load32_zero(p as *const u32))))
    }

    /// Divide each lane of an i32x4 running sum by `count` and store as u8,
    /// replicating the scalar integer division/truncation.
    #[inline]
    fn store_div_u8x4(dst: &mut [u8], sums: v128, count: u32) {
        dst[0] = (i32x4_extract_lane::<0>(sums) as u32 / count) as u8;
        dst[1] = (i32x4_extract_lane::<1>(sums) as u32 / count) as u8;
        dst[2] = (i32x4_extract_lane::<2>(sums) as u32 / count) as u8;
        dst[3] = (i32x4_extract_lane::<3>(sums) as u32 / count) as u8;
    }

    /// Truncate + clamp to [0, 255] and store the first three (RGB) lanes,
    /// leaving the alpha byte untouched.
    #[inline]
    fn clamp_trunc_store3(dst: &mut [u8], v: v128) {
        let t = f32x4_trunc(v);
        let lo = f32x4_pmax(t, f32x4_splat(0.0));
        let c = f32x4_pmin(lo, f32x4_splat(255.0));
        dst[0] = f32x4_extract_lane::<0>(c) as u8;
        dst[1] = f32x4_extract_lane::<1>(c) as u8;
        dst[2] = f32x4_extract_lane::<2>(c) as u8;
    }

    pub(crate) fn blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
        let w = width as usize;
        let h = height as usize;
        if radius == 0 || w == 0 || h == 0 { return; }
        if data.len() < w.saturating_mul(h).saturating_mul(4) { return; }
        let r = (radius as usize).min(w.max(h));
        crate::with_scratch(data.len(), |temp| {
            // Horizontal sliding-window pass; sums accumulate in i32x4 lanes.
            for y in 0..h {
                let base = y * w;
                let seed = (r + 1).min(w);
                let mut sums = i32x4_splat(0);
                for x in 0..seed {
                    let i = (base + x) * 4;
                    sums = i32x4_add(sums, unsafe { load_u8x4_i32(data.as_ptr().add(i)) });
                }
                let mut count = seed as u32;
                for x in 0..w {
                    let i = (base + x) * 4;
                    store_div_u8x4(&mut temp[i..i + 4], sums, count);
                    let enter = x + r + 1;
                    if enter < w {
                        let ie = (base + enter) * 4;
                        sums = i32x4_add(sums, unsafe { load_u8x4_i32(data.as_ptr().add(ie)) });
                        count += 1;
                    }
                    if x >= r {
                        let il = (base + x - r) * 4;
                        sums = i32x4_sub(sums, unsafe { load_u8x4_i32(data.as_ptr().add(il)) });
                        count -= 1;
                    }
                }
            }
            // Vertical sliding-window pass.
            for x in 0..w {
                let seed = (r + 1).min(h);
                let mut sums = i32x4_splat(0);
                for y in 0..seed {
                    let i = (y * w + x) * 4;
                    sums = i32x4_add(sums, unsafe { load_u8x4_i32(temp.as_ptr().add(i)) });
                }
                let mut count = seed as u32;
                for y in 0..h {
                    let i = (y * w + x) * 4;
                    store_div_u8x4(&mut data[i..i + 4], sums, count);
                    let enter = y + r + 1;
                    if enter < h {
                        let ie = (enter * w + x) * 4;
                        sums = i32x4_add(sums, unsafe { load_u8x4_i32(temp.as_ptr().add(ie)) });
                        count += 1;
                    }
                    if y >= r {
                        let il = ((y - r) * w + x) * 4;
                        sums = i32x4_sub(sums, unsafe { load_u8x4_i32(temp.as_ptr().add(il)) });
                        count -= 1;
                    }
                }
            }
        });
    }

    pub(crate) fn sharpen(data: &mut [u8], width: u32, height: u32, amount: f64) {
        let w = width as usize;
        let h = height as usize;
        if w < 3 || h < 3 { return; }
        let amount_f = amount as f32;
        crate::with_scratch(data.len(), |temp| {
            temp.copy_from_slice(data);
            for y in 1..h - 1 {
                for x in 1..w - 1 {
                    let i = (y * w + x) * 4;
                    let val = unsafe { load_u8x4_f32(temp.as_ptr().add(i)) };
                    let up = unsafe { load_u8x4_f32(temp.as_ptr().add(((y - 1) * w + x) * 4)) };
                    let down = unsafe { load_u8x4_f32(temp.as_ptr().add(((y + 1) * w + x) * 4)) };
                    let left = unsafe { load_u8x4_f32(temp.as_ptr().add((y * w + x - 1) * 4)) };
                    let right = unsafe { load_u8x4_f32(temp.as_ptr().add((y * w + x + 1) * 4)) };
                    let sum = f32x4_add(f32x4_add(up, down), f32x4_add(left, right));
                    let lap = f32x4_sub(f32x4_mul(val, f32x4_splat(5.0)), sum);
                    let diff = f32x4_sub(lap, val);
                    let out = f32x4_add(val, f32x4_mul(diff, f32x4_splat(amount_f)));
                    clamp_trunc_store3(&mut data[i..], out);
                }
            }
        });
    }

    pub(crate) fn noise(data: &mut [u8], intensity: f64, seed: f64) {
        let factor = intensity / 100.0 * 255.0;
        if factor == 0.0 { return; }
        // Same PRNG sequence as the scalar reference (one draw per pixel).
        let mut rng = crate::noise::Xorshift32::new(crate::noise::noise_seed_state(seed));
        for px in data.chunks_exact_mut(4) {
            let noise = (rng.next_unit() - 0.5) * factor;
            let v = unsafe { load_u8x4_f32(px.as_ptr()) };
            let out = f32x4_add(v, f32x4_splat(noise as f32));
            clamp_trunc_store3(px, out);
        }
    }

    // Byte-shuffle indices to transpose 4 interleaved RGBA pixels into
    // one f32x4 lane per channel across the 4 pixels. Indices >= 16 zero
    // the lane (i8x16.swizzle semantics), leaving only lanes 0..3 populated.
    const R_IDX: v128 = i8x16(0, 4, 8, 12, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);
    const G_IDX: v128 = i8x16(1, 5, 9, 13, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);
    const B_IDX: v128 = i8x16(2, 6, 10, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16);

    /// The scalar `hue_to_rgb` converted branchlessly: the four `if` arms are
    /// resolved with comparison masks + `v128_bitselect`.
    #[inline]
    fn hue_to_rgb(p: v128, q: v128, t: v128) -> v128 {
        let t_lt0 = f32x4_lt(t, f32x4_splat(0.0));
        let t_gt1 = f32x4_gt(t, f32x4_splat(1.0));
        let t = f32x4_add(t, v128_bitselect(f32x4_splat(1.0), f32x4_splat(0.0), t_lt0));
        let t = f32x4_sub(t, v128_bitselect(f32x4_splat(1.0), f32x4_splat(0.0), t_gt1));
        let qp = f32x4_sub(q, p);
        let r1 = f32x4_add(p, f32x4_mul(f32x4_mul(qp, f32x4_splat(6.0)), t));
        let r3 = f32x4_add(p, f32x4_mul(f32x4_mul(qp, f32x4_splat(6.0)), f32x4_sub(f32x4_splat(2.0 / 3.0), t)));
        let t_lt_1_6 = f32x4_lt(t, f32x4_splat(1.0 / 6.0));
        let t_lt_0_5 = f32x4_lt(t, f32x4_splat(0.5));
        let t_lt_2_3 = f32x4_lt(t, f32x4_splat(2.0 / 3.0));
        let res = v128_bitselect(r3, p, t_lt_2_3);
        let res = v128_bitselect(q, res, t_lt_0_5);
        v128_bitselect(r1, res, t_lt_1_6)
    }

    #[inline]
    fn clamp255(v: v128) -> v128 {
        let t = f32x4_trunc(v);
        f32x4_pmin(f32x4_pmax(t, f32x4_splat(0.0)), f32x4_splat(255.0))
    }

    /// Store R/G/B back into the interleaved layout, leaving alpha bytes
    /// (offsets 3, 7, 11, 15) untouched — HSL only affects color channels.
    #[inline]
    fn store4(dst: &mut [u8], r: v128, g: v128, b: v128) {
        // hue_to_rgb returns [0, 1]; scale to [0, 255] before the u8 clamp.
        let s255 = f32x4_splat(255.0);
        let r = clamp255(f32x4_mul(r, s255));
        let g = clamp255(f32x4_mul(g, s255));
        let b = clamp255(f32x4_mul(b, s255));
        dst[0] = f32x4_extract_lane::<0>(r) as u8;
        dst[1] = f32x4_extract_lane::<0>(g) as u8;
        dst[2] = f32x4_extract_lane::<0>(b) as u8;
        dst[4] = f32x4_extract_lane::<1>(r) as u8;
        dst[5] = f32x4_extract_lane::<1>(g) as u8;
        dst[6] = f32x4_extract_lane::<1>(b) as u8;
        dst[8] = f32x4_extract_lane::<2>(r) as u8;
        dst[9] = f32x4_extract_lane::<2>(g) as u8;
        dst[10] = f32x4_extract_lane::<2>(b) as u8;
        dst[12] = f32x4_extract_lane::<3>(r) as u8;
        dst[13] = f32x4_extract_lane::<3>(g) as u8;
        dst[14] = f32x4_extract_lane::<3>(b) as u8;
    }

    /// Apply the scalar HSL math to 4 pixels at once (one f32x4 lane per
    /// pixel, per channel). The per-pixel branches (max == r/g/b, l > 0.5,
    /// s == 0) become branchless mask selects; the saturation/lightness
    /// branches are call-constant and resolved into a*s+b coefficients.
    #[inline]
    unsafe fn hsl4(dst: &mut [u8], hue_shift: f32, a_sat: f32, b_sat: f32, a_l: f32, b_l: f32) {
        let v = v128_load(dst.as_ptr() as *const v128);
        let inv255 = f32x4_splat(1.0 / 255.0);
        let r = f32x4_mul(f32x4_convert_i32x4(u32x4_extend_low_u16x8(u16x8_extend_low_u8x16(i8x16_swizzle(v, R_IDX)))), inv255);
        let g = f32x4_mul(f32x4_convert_i32x4(u32x4_extend_low_u16x8(u16x8_extend_low_u8x16(i8x16_swizzle(v, G_IDX)))), inv255);
        let b = f32x4_mul(f32x4_convert_i32x4(u32x4_extend_low_u16x8(u16x8_extend_low_u8x16(i8x16_swizzle(v, B_IDX)))), inv255);

        let max = f32x4_pmax(f32x4_pmax(r, g), b);
        let min = f32x4_pmin(f32x4_pmin(r, g), b);
        let l = f32x4_mul(f32x4_add(max, min), f32x4_splat(0.5));
        let d = f32x4_sub(max, min);

        let d_nonzero = f32x4_ne(d, f32x4_splat(0.0));
        let l_gt_half = f32x4_gt(l, f32x4_splat(0.5));
        let denom = v128_bitselect(
            f32x4_sub(f32x4_splat(2.0), f32x4_add(max, min)),
            f32x4_add(max, min),
            l_gt_half,
        );
        let s = v128_bitselect(f32x4_div(d, denom), f32x4_splat(0.0), d_nonzero);

        let max_eq_r = f32x4_eq(max, r);
        let max_eq_g = f32x4_eq(max, g);
        let g_lt_b = f32x4_lt(g, b);
        let h_r = f32x4_add(
            f32x4_div(f32x4_sub(g, b), d),
            v128_bitselect(f32x4_splat(6.0), f32x4_splat(0.0), g_lt_b),
        );
        let h_g = f32x4_add(f32x4_div(f32x4_sub(b, r), d), f32x4_splat(2.0));
        let h_b = f32x4_add(f32x4_div(f32x4_sub(r, g), d), f32x4_splat(4.0));
        let h = v128_bitselect(h_g, h_b, max_eq_g);
        let h = v128_bitselect(h_r, h, max_eq_r);
        let h = v128_bitselect(f32x4_mul(h, f32x4_splat(1.0 / 6.0)), f32x4_splat(0.0), d_nonzero);

        // h = (h + hue/360).rem_euclid(1.0) == t - floor(t)
        let t = f32x4_add(h, f32x4_splat(hue_shift));
        let h = f32x4_sub(t, f32x4_floor(t));

        let s = f32x4_pmax(
            f32x4_pmin(f32x4_add(f32x4_mul(s, f32x4_splat(a_sat)), f32x4_splat(b_sat)), f32x4_splat(1.0)),
            f32x4_splat(0.0),
        );
        let l = f32x4_pmax(
            f32x4_pmin(f32x4_add(f32x4_mul(l, f32x4_splat(a_l)), f32x4_splat(b_l)), f32x4_splat(1.0)),
            f32x4_splat(0.0),
        );

        let s_zero = f32x4_eq(s, f32x4_splat(0.0));
        let l_lt_half = f32x4_lt(l, f32x4_splat(0.5));
        let q = v128_bitselect(
            f32x4_mul(l, f32x4_add(f32x4_splat(1.0), s)),
            f32x4_sub(f32x4_add(l, s), f32x4_mul(l, s)),
            l_lt_half,
        );
        let p = f32x4_sub(f32x4_mul(f32x4_splat(2.0), l), q);

        let nr = v128_bitselect(l, hue_to_rgb(p, q, f32x4_add(h, f32x4_splat(1.0 / 3.0))), s_zero);
        let ng = v128_bitselect(l, hue_to_rgb(p, q, h), s_zero);
        let nb = v128_bitselect(l, hue_to_rgb(p, q, f32x4_sub(h, f32x4_splat(1.0 / 3.0))), s_zero);

        store4(dst, nr, ng, nb);
    }

    pub(crate) fn hsl(data: &mut [u8], hue: f64, saturation: f64, lightness: f64) {
        let pixels = data.len() / 4;
        if pixels == 0 { return; }
        // Match the scalar short-circuit: a whole multiple of 360° with no
        // saturation/lightness is a no-op, so skip the round-trip entirely.
        if hue % 360.0 == 0.0 && saturation == 0.0 && lightness == 0.0 {
            return;
        }
        // The scalar saturation/lightness branches depend only on the call
        // constants, so resolve them once here into a*s + b coefficients.
        // Use the fractional part of hue/360: the integer part is discarded
        // by the mod-1 anyway, and keeping the shift in (-1, 1) makes an
        // integer hue (e.g. 360°) an exact no-op instead of losing the low
        // bits of `h` through `h + 1.0 - floor(h + 1.0)` in f32.
        let hue_shift = ((hue / 360.0).fract()) as f32;
        let sm = 1.0 + saturation / 100.0;
        let (a_sat, b_sat) = if sm >= 1.0 { ((2.0 - sm) as f32, (sm - 1.0) as f32) } else { (sm as f32, 0.0f32) };
        let ls = lightness / 100.0;
        let (a_l, b_l) = if ls > 0.0 { ((1.0 - ls) as f32, ls as f32) } else { ((1.0 + ls) as f32, 0.0f32) };
        let blocks = pixels / 4;
        for i in 0..blocks {
            unsafe { hsl4(&mut data[i * 16..i * 16 + 16], hue_shift, a_sat, b_sat, a_l, b_l); }
        }
        // Remaining 1..3 pixels (plus any trailing non-RGBA bytes) run through
        // the scalar reference, which only touches complete 4-byte pixels.
        let tail = blocks * 16;
        if tail < data.len() {
            crate::color::apply_hsl(&mut data[tail..], hue, saturation, lightness);
        }
    }
}

pub(crate) use imp::{blur, hsl, noise, sharpen};
