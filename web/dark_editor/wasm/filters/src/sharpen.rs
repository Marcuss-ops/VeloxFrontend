// Unsharp-mask style sharpen using a 3x3 Laplacian kernel.
pub(crate) fn apply(data: &mut [u8], width: u32, height: u32, amount: f64) {
    let w = width as usize;
    let h = height as usize;
    if w < 3 || h < 3 { return; }
    crate::with_scratch(data.len(), |temp| {
        temp.copy_from_slice(data);
        for y in 1..h - 1 {
            for x in 1..w - 1 {
                let i = (y * w + x) * 4;
                for c in 0..3 {
                    let val = temp[i + c] as f64;
                    let up = temp[((y - 1) * w + x) * 4 + c] as f64;
                    let down = temp[((y + 1) * w + x) * 4 + c] as f64;
                    let left = temp[(y * w + x - 1) * 4 + c] as f64;
                    let right = temp[(y * w + x + 1) * 4 + c] as f64;
                    let lap = val * 5.0 - (up + down + left + right);
                    data[i + c] = crate::clamp(val + (lap - val) * amount);
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sharpen_constant_image_is_unchanged() {
        let mut data = vec![100u8; 9 * 4];
        for px in data.chunks_exact_mut(4) { px[3] = 255; }
        let original = data.clone();
        apply(&mut data, 3, 3, 0.8);
        assert_eq!(data, original);
    }
}
