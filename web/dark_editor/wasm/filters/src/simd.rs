// SIMD (wasm simd128) implementations of the hot filters, used to evaluate
// whether the speedup justifies switching the pipeline away from the f64
// scalar reference. On non-wasm targets (e.g. the host running `cargo test`)
// these delegate to the scalar implementations, since the simd128 intrinsics
// only exist on wasm32.
//
// Byte-identity: blur is integer-only (i32x4 channel sums), so it is exactly
// byte-identical to the scalar blur. sharpen and noise convert the scalar
// f64 math to f32, so they may differ from the scalar reference by a fraction
// of an LSB on a small number of pixels — the Node benchmark reports the
// actual deviation.

#[cfg(not(target_arch = "wasm32"))]
mod imp {
    pub(crate) fn blur(data: &mut [u8], width: u32, height: u32, radius: u32) {
        crate::wasm_apply_blur(data, width, height, radius);
    }
    pub(crate) fn sharpen(data: &mut [u8], width: u32, height: u32, amount: f64) {
        crate::wasm_apply_sharpen(data, width, height, amount);
    }
    pub(crate) fn noise(data: &mut [u8], intensity: f64, seed: f64) {
        crate::wasm_apply_noise(data, intensity, seed);
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
        let mut rng = crate::Xorshift32::new(crate::noise_seed_state(seed));
        for px in data.chunks_exact_mut(4) {
            let noise = (rng.next_unit() - 0.5) * factor;
            let v = unsafe { load_u8x4_f32(px.as_ptr()) };
            let out = f32x4_add(v, f32x4_splat(noise as f32));
            clamp_trunc_store3(px, out);
        }
    }
}

pub(crate) use imp::{blur, noise, sharpen};
