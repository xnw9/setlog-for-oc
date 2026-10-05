import { useEffect, useRef } from 'react';

/**
 * Shows a stored Blob in an <img>: attach the returned ref to the image.
 * The temporary object URL is revoked when the blob changes or the image unmounts.
 */
export function useBlobImage(blob: Blob | undefined) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || !blob) return;
    const url = URL.createObjectURL(blob);
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
      img.removeAttribute('src');
    };
  }, [blob]);

  return ref;
}
