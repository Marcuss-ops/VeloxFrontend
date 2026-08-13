// Box blur with a sliding window: each step costs O(1) (add the pixel
// entering the window, drop the one leaving) instead of re-summing 2r+1
// pixels per output pixel, so both passes are O(w*h) independent of radius.
pub(crate) fn apply(data: &mut [u8], width: u32, height: u32, radius: u32) {
    let w = width as usize;
    let h = height as usize;
    if radius == 0 || w == 0 || h == 0 { return; }
    if data.len() < w.saturating_mul(h).saturating_mul(4) { return; }
    // Clamping preserves exact results (a window already spans the whole
    // image once r >= max(w, h)) and keeps x + r + 1 overflow-free.
    let r = (radius as usize).min(w.max(h));
    crate::with_scratch(data.len(), |temp| {
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

#[cfg(test)]
mod tests {
    use super::*;

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
    fn blur_constant_image_is_unchanged() {
        let mut data = vec![100u8; 9 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        apply(&mut data, 3, 3, 1);
        assert_eq!(data, original);
    }

    #[test]
    fn sliding_blur_matches_naive() {
        for &(w, h) in &[(1usize, 1usize), (2, 3), (3, 3), (5, 4), (17, 9), (64, 48)] {
            for &r in &[0u32, 1, 2, 4, 7, 100] {
                let data = fill_test_image(w * h * 4, 0xC0FFEE ^ (w as u32) ^ (h as u32) ^ r);
                let mut expected = data.clone();
                blur_naive(&mut expected, w, h, r as usize);
                let mut actual = data.clone();
                apply(&mut actual, w as u32, h as u32, r);
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
                    apply(&mut buf, w as u32, h as u32, r);
                    slide_min = slide_min.min(t.elapsed());
                }
                assert_eq!(blur_naive_check(&data, w, h, r), blur_sliding_check(&data, w, h, r));
                let speedup = naive_min.as_secs_f64() / slide_min.as_secs_f64().max(1e-9);
                println!("blur {w}x{h} r={r:>3}: naive {:>10.3?}  sliding {:>10.3?}  speedup {speedup:.2}x",
                    naive_min, slide_min);
            }
        }
    }

    fn blur_naive_check(data: &[u8], w: usize, h: usize, r: u32) -> Vec<u8> {
        let mut out = data.to_vec();
        blur_naive(&mut out, w, h, r as usize);
        out
    }

    fn blur_sliding_check(data: &[u8], w: usize, h: usize, r: u32) -> Vec<u8> {
        let mut out = data.to_vec();
        apply(&mut out, w as u32, h as u32, r);
        out
    }
}
