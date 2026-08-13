// Pixelation: replace each size x size block with its top-left pixel.
pub(crate) fn apply(data: &mut [u8], width: u32, height: u32, size: u32) {
    if size <= 1 || width == 0 || height == 0 { return; }
    let w = width as usize;
    let h = height as usize;
    let size = size as usize;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pixelation_copies_the_block_origin() {
        let mut data = vec![10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 1, 2, 3, 255];
        apply(&mut data, 2, 2, 2);
        assert_eq!(&data[4..8], &[10, 20, 30, 255]);
        assert_eq!(&data[8..12], &[10, 20, 30, 255]);
    }
}
