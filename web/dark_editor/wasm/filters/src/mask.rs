// Mask processing for the editor image core.
//
// Minimal alpha-mask primitive: multiplies the image alpha by a per-pixel
// mask, optionally feathering the mask first with the same sliding-window
// box blur used by the main blur. Advanced mask operations (dilate/erode,
// threshold, edge cleanup) arrive with the segmentation-mask work.

pub(crate) fn process(
    data: &mut [u8],
    mask: &[u8],
    width: usize,
    height: usize,
    feather: usize,
) {
    if width == 0 || height == 0 { return; }
    let pixels = width.saturating_mul(height);
    if data.len() < pixels.saturating_mul(4) || mask.len() < pixels { return; }

    // Clamp the radius like blur: a window already spans the whole image
    // once r >= max(width, height), and it keeps x + r + 1 overflow-free.
    let feather = feather.min(width.max(height));

    if feather > 0 {
        crate::with_scratch(pixels, |horiz| {
            crate::with_scratch2(pixels, |out| {
                feather_mask(&mask[..pixels], horiz, out, width, height, feather);
                multiply_alpha(data, out, pixels);
            });
        });
    } else {
        crate::with_scratch(pixels, |scratch| {
            scratch.copy_from_slice(&mask[..pixels]);
            multiply_alpha(data, scratch, pixels);
        });
    }
}

fn multiply_alpha(data: &mut [u8], feathered_mask: &[u8], pixels: usize) {
    for i in 0..pixels {
        let alpha = data[i * 4 + 3] as u32;
        let m = feathered_mask[i] as u32;
        data[i * 4 + 3] = ((alpha * m) / 255) as u8;
    }
}

// Separable sliding-window box blur over a single-channel mask.
fn feather_mask(src: &[u8], horiz: &mut [u8], out: &mut [u8], w: usize, h: usize, r: usize) {
    for y in 0..h {
        let base = y * w;
        let seed = (r + 1).min(w);
        let mut sum = 0u32;
        for x in 0..seed { sum += src[base + x] as u32; }
        let mut count = seed as u32;
        for x in 0..w {
            horiz[base + x] = (sum / count) as u8;
            let enter = x + r + 1;
            if enter < w { sum += src[base + enter] as u32; count += 1; }
            if x >= r { sum -= src[base + x - r] as u32; count -= 1; }
        }
    }
    for x in 0..w {
        let seed = (r + 1).min(h);
        let mut sum = 0u32;
        for y in 0..seed { sum += horiz[y * w + x] as u32; }
        let mut count = seed as u32;
        for y in 0..h {
            out[y * w + x] = (sum / count) as u8;
            let enter = y + r + 1;
            if enter < h { sum += horiz[enter * w + x] as u32; count += 1; }
            if y >= r { sum -= horiz[(y - r) * w + x] as u32; count -= 1; }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn raw_mask_multiplies_alpha() {
        let mut data = vec![10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255];
        let mask = vec![255, 128, 0, 64];
        process(&mut data, &mask, 2, 2, 0);
        assert_eq!(data[3], 255);
        assert_eq!(data[7], 128);
        assert_eq!(data[11], 0);
        assert_eq!(data[15], 64);
        assert_eq!(&data[0..3], &[10, 20, 30]);
    }

    #[test]
    fn feather_softens_a_step_mask() {
        // 1x8 mask: four 255 then four 0; feather 2 blurs the boundary.
        let mut data = vec![0u8; 8 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let mask = vec![255, 255, 255, 255, 0, 0, 0, 0];
        process(&mut data, &mask, 8, 1, 2);
        assert_eq!(data[3], 255); // interior of the white half
        assert_eq!(data[7 * 4 + 3], 0); // far side of the black half
        let mid = data[4 * 4 + 3];
        assert!(mid > 0 && mid < 255, "boundary alpha should be soft, got {mid}");
    }
}
