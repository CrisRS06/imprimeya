/**
 * Generate a small thumbnail from a File for preview display.
 * Uses OffscreenCanvas when available, falls back to regular canvas.
 * Returns a blob URL of the thumbnail.
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 256
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  let blob: Blob;

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
  } else {
    // Fallback for older browsers
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7)
    );
    canvas.width = 0;
    canvas.height = 0;
  }

  bitmap.close();
  return URL.createObjectURL(blob);
}
