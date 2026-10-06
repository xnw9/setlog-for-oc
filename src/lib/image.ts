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

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Scales an image down so its long side is at most `maxSide` px (never up), as a JPEG.
 * Throws if the browser can't decode the file (e.g. HEIC outside Safari).
 */
export async function resizeImage(file: Blob, maxSide = 2048): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file); // applies EXIF orientation
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not encode image'))),
        'image/jpeg',
        0.9,
      ),
    );
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
