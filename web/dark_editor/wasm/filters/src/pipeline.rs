// Single-entry filter chain: the worker sends the image into WASM once and
// every enabled filter runs here, in the same order the worker previously
// applied them with separate per-filter crossings.

use crate::{color, curves, pixelate, PipelineConfig};

pub(crate) fn apply_pipeline(
    data: &mut [u8],
    width: u32,
    height: u32,
    config: PipelineConfig,
    curve_r: &[u8],
    curve_g: &[u8],
    curve_b: &[u8],
) {
    if config.pixelation > 0.0 {
        pixelate::apply(data, width, height, config.pixelation as u32);
    }
    if config.blur > 0.0 {
        crate::simd::blur(data, width, height, config.blur as u32);
    }
    if config.sharpen > 0.0 {
        crate::simd::sharpen(data, width, height, config.sharpen);
    }
    if config.hue != 0.0 || config.saturation != 0.0 || config.lightness != 0.0 {
        // HSL routes through the simd128 variant (branchless, 4 px/lane). On
        // non-wasm targets simd::hsl delegates to the scalar reference, so
        // the host tests stay byte-identical.
        crate::simd::hsl(data, config.hue, config.saturation, config.lightness);
    }
    if config.brightness != 0.0 || config.contrast != 0.0 {
        color::apply_brightness_contrast(data, config.brightness, config.contrast);
    }
    if config.vignette_radius > 0.0 {
        color::apply_vignette(data, width, height, config.vignette_radius, config.vignette_softness);
    }
    if config.noise_intensity > 0.0 {
        crate::simd::noise(data, config.noise_intensity, config.noise_seed);
    }
    // Empty slices mean "no curves", matching the worker's previous
    // `curveR && curveG && curveB` guard (curves::apply no-ops on empty).
    if !curve_r.is_empty() && !curve_g.is_empty() && !curve_b.is_empty() {
        curves::apply(data, curve_r, curve_g, curve_b);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{blur, color, curves, noise, pixelate, sharpen};

    #[test]
    fn pipeline_disabled_is_a_noop() {
        let mut data = vec![10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 1, 2, 3, 255];
        let original = data.clone();
        let no_curves: [u8; 0] = [];
        apply_pipeline(&mut data, 2, 2, PipelineConfig::new(), &no_curves, &no_curves, &no_curves);
        assert_eq!(data, original);
    }

    #[test]
    fn pipeline_matches_sequential_filter_calls() {
        let mut data = vec![
            10, 20, 30, 255, 200, 180, 160, 255, 50, 60, 70, 255,
            90, 100, 110, 255, 15, 25, 35, 255, 240, 230, 220, 255,
            120, 130, 140, 255, 5, 15, 25, 255, 210, 200, 190, 255,
        ];
        let mut expected = data.clone();
        pixelate::apply(&mut expected, 3, 3, 2);
        blur::apply(&mut expected, 3, 3, 1);
        sharpen::apply(&mut expected, 3, 3, 0.5);
        color::apply_hsl(&mut expected, 10.0, 5.0, -5.0);
        color::apply_brightness_contrast(&mut expected, 8.0, 10.0);
        color::apply_vignette(&mut expected, 3, 3, 40.0, 50.0);
        noise::apply(&mut expected, 10.0, 42.0);
        let c: Vec<u8> = (0u8..=255).map(|v| v.wrapping_add(2)).collect();
        curves::apply(&mut expected, &c, &c, &c);

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
        apply_pipeline(&mut data, 3, 3, config, &c, &c, &c);
        assert_eq!(data, expected);
    }
}
