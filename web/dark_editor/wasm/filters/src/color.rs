// Color adjustments: HSL, brightness/contrast and vignette.

#[inline]
fn hue_to_rgb(p: f64, q: f64, mut t: f64) -> f64 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { p + (q - p) * 6.0 * t }
    else if t < 0.5 { q }
    else if t < 2.0 / 3.0 { p + (q - p) * (2.0 / 3.0 - t) * 6.0 }
    else { p }
}

pub(crate) fn apply_hsl(data: &mut [u8], hue: f64, saturation: f64, lightness: f64) {
    // A hue that is a whole multiple of 360° plus zero saturation/lightness
    // is a semantic no-op: return without the RGB->HSL->RGB round-trip, which
    // would otherwise perturb pixels by an LSB at the truncation boundary.
    if hue % 360.0 == 0.0 && saturation == 0.0 && lightness == 0.0 {
        return;
    }
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
        px[0] = crate::clamp(nr * 255.0);
        px[1] = crate::clamp(ng * 255.0);
        px[2] = crate::clamp(nb * 255.0);
    }
}

pub(crate) fn apply_brightness_contrast(data: &mut [u8], brightness: f64, contrast: f64) {
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    for px in data.chunks_exact_mut(4) {
        for channel in px.iter_mut().take(3) {
            *channel = crate::clamp(factor * (*channel as f64 + brightness - 128.0) + 128.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hsl_whole_rotation_with_zero_sat_light_is_a_noop() {
        let mut data = vec![100, 150, 200, 255, 10, 20, 30, 128, 250, 240, 230, 64];
        let original = data.clone();
        apply_hsl(&mut data, 360.0, 0.0, 0.0);
        assert_eq!(data, original);
        apply_hsl(&mut data, -360.0, 0.0, 0.0);
        assert_eq!(data, original);
        apply_hsl(&mut data, 720.0, 0.0, 0.0);
        assert_eq!(data, original);
    }
}

pub(crate) fn apply_vignette(data: &mut [u8], width: u32, height: u32, radius: f64, softness: f64) {
    let w = width as usize;
    let h = height as usize;
    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;
    let max_dist = (cx * cx + cy * cy).sqrt();
    let limit = radius / 100.0 * max_dist;
    let soft = softness / 100.0;
    for y in 0..h {
        for x in 0..w {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist > limit * (1.0 - soft) {
                let factor = 1.0 - ((dist - limit * (1.0 - soft)) / (limit * soft).max(1.0)).min(1.0);
                let i = (y * w + x) * 4;
                if i + 2 < data.len() {
                    for c in 0..3 { data[i + c] = crate::clamp(data[i + c] as f64 * factor); }
                }
            }
        }
    }
}
