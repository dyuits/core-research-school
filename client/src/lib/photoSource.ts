const convertedPhotos = new WeakMap<File, Promise<Blob>>();
const heifBrands = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

async function convertPhoto(file: File): Promise<Blob> {
  const header = new DataView(await file.slice(0, 256).arrayBuffer());
  if (header.byteLength < 16 || header.getUint32(4) !== 0x66747970) return file;
  const brands = new Set<string>();
  for (
    let offset = 8;
    offset + 4 <= Math.min(header.getUint32(0), header.byteLength);
    offset += 4
  ) {
    if (offset !== 12)
      brands.add(
        String.fromCharCode(
          ...Array.from(new Uint8Array(header.buffer, offset, 4))
        )
      );
  }
  if (
    brands.has("avif") ||
    brands.has("avis") ||
    !Array.from(brands).some(brand => heifBrands.has(brand))
  )
    return file;
  const { heicTo } = await import("heic-to/csp");
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
}

export function photoSource(file: File): Promise<Blob> {
  const existing = convertedPhotos.get(file);
  if (existing) return existing;
  const conversion = convertPhoto(file).catch(() => {
    convertedPhotos.delete(file);
    throw new Error(
      `${file.name} 사진을 변환하지 못했습니다. JPG 또는 PNG로 내보낸 뒤 다시 선택하세요.`
    );
  });
  convertedPhotos.set(file, conversion);
  return conversion;
}
