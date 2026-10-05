/**
 * Centre-crops an image to a square and scales it to `size` px, e.g. for avatars.
 * Throws if the browser can't decode the file (e.g. HEIC outside Safari).
 */
export async function squareImage(file: Blob, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // applies EXIF orientation
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
        'image/jpeg',
        0.9,
      ),
    );
  } finally {
    bitmap.close();
  }
}
