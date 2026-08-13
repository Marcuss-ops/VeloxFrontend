// Blend-mode compositing for the editor image core.
//
// This is a two-image primitive (overlay composited onto base) and lives
// outside the single-image filter pipeline. It is intentionally NOT wired
// into normal rendering: Konva/browser Canvas already composites layers.
// It becomes part of the rendering path only when custom raster compositing
// arrives (custom blend modes, alpha masks, LUTs, chroma key, ...).

/// Per-channel blend result in [0, 1] for a single blend `mode`.
#[inline]
pub(crate) fn blend_channel(base: f64, overlay: f64, mode: u32) -> f64 {
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

/// Source-over composite of `overlay` onto `base` for `count` bytes (a
/// multiple of 4, RGBA), writing the result back into `base`.
pub(crate) fn composite(base: &mut [u8], overlay: &[u8], count: usize, mode: u32) {
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
            base[i + c] = crate::clamp(
                ((blended * src_weight) + (old[c] as f64 / 255.0) * dst_weight) / out_a * 255.0,
            );
        }
        base[i + 3] = crate::clamp(out_a * 255.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multiply_darkens_opaque_pixels() {
        let mut base = vec![200, 100, 50, 255];
        let overlay = vec![128, 128, 128, 255];
        composite(&mut base, &overlay, 4, 1);
        assert_eq!(base, vec![100, 50, 25, 255]);
    }

    #[test]
    fn screen_lightens_opaque_pixels() {
        let mut base = vec![255, 100, 100, 255];
        let overlay = vec![0, 128, 255, 255];
        composite(&mut base, &overlay, 4, 2);
        assert_eq!(base, vec![255, 177, 255, 255]);
    }

    #[test]
    fn difference_returns_channel_difference() {
        let mut base = vec![255, 100, 0, 255];
        let overlay = vec![0, 100, 255, 255];
        composite(&mut base, &overlay, 4, 10);
        assert_eq!(base, vec![255, 0, 255, 255]);
    }

    #[test]
    fn transparent_overlay_is_a_noop() {
        let mut base = vec![10, 20, 30, 128];
        let overlay = vec![200, 100, 50, 0];
        composite(&mut base, &overlay, 4, 1);
        assert_eq!(base, vec![10, 20, 30, 128]);
    }

    #[test]
    fn opaque_overlay_replaces_base_in_normal_mode() {
        let mut base = vec![10, 20, 30, 0];
        let overlay = vec![200, 100, 50, 255];
        composite(&mut base, &overlay, 4, 0);
        assert_eq!(base, vec![200, 100, 50, 255]);
    }

    #[test]
    fn partial_alpha_mixes_both_layers() {
        // red base under half-alpha blue overlay, normal mode (0)
        let mut base = vec![255, 0, 0, 255];
        let overlay = vec![0, 0, 255, 128];
        composite(&mut base, &overlay, 4, 0);
        assert_eq!(base, vec![127, 0, 128, 255]);
    }

    #[test]
    fn fully_transparent_both_layers_is_clear() {
        let mut base = vec![100, 100, 100, 0];
        let overlay = vec![200, 200, 200, 0];
        composite(&mut base, &overlay, 4, 1);
        assert_eq!(base, vec![0, 0, 0, 0]);
    }

    #[test]
    fn is_deterministic() {
        let mut a = vec![10, 20, 30, 128, 40, 50, 60, 200];
        let overlay = vec![200, 100, 50, 64, 1, 2, 3, 255];
        let expected = {
            let mut b = a.clone();
            composite(&mut b, &overlay, 8, 5);
            b
        };
        composite(&mut a, &overlay, 8, 5);
        assert_eq!(a, expected);
    }

    #[test]
    fn misaligned_buffers_do_not_panic() {
        // width*height*4 (8) exceeds both buffers (6): the entry point must
        // round the count down to whole pixels instead of reading past the end.
        let mut base = vec![10, 10, 10, 255, 10, 10];
        let overlay = vec![20, 20, 20, 255, 20, 20];
        crate::blend_layers(&mut base, &overlay, 2, 1, 1);
        assert_eq!(base, vec![0, 0, 0, 255, 10, 10]);
    }
}
