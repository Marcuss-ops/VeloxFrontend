// Per-channel color curves: each 0..255 input byte is remapped through the
// provided lookup table.
pub(crate) fn apply(data: &mut [u8], curve_r: &[u8], curve_g: &[u8], curve_b: &[u8]) {
    for px in data.chunks_exact_mut(4) {
        if curve_r.len() > px[0] as usize { px[0] = curve_r[px[0] as usize]; }
        if curve_g.len() > px[1] as usize { px[1] = curve_g[px[1] as usize]; }
        if curve_b.len() > px[2] as usize { px[2] = curve_b[px[2] as usize]; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curves_are_deterministic() {
        let mut data = vec![1, 2, 3, 255];
        let c: Vec<u8> = (0..=255).rev().collect();
        apply(&mut data, &c, &c, &c);
        assert_eq!(&data[..3], &[254, 253, 252]);
    }
}
