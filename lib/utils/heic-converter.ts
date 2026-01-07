/**
 * Utilidades para conversion de imagenes HEIC/HEIF a JPEG
 * Usa la libreria heic-to que utiliza WebAssembly para la conversion
 */

/**
 * Verifica si un archivo es formato HEIC/HEIF
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = [
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ];

  // Verificar por MIME type
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Verificar por extension (algunos navegadores no reportan el MIME type correctamente)
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "heic" || extension === "heif";
}

// Timeout para conversion HEIC (15 segundos)
const HEIC_CONVERSION_TIMEOUT = 15000;

/**
 * Convierte un archivo HEIC/HEIF a JPEG con timeout
 * @param file Archivo HEIC/HEIF
 * @param quality Calidad de compresion JPEG (0-1)
 * @returns Archivo JPEG
 */
export async function convertHeicToJpeg(
  file: File,
  quality: number = 0.92
): Promise<File> {
  // Importar heic-to dinamicamente para evitar cargar el WASM si no es necesario
  const { heicTo } = await import("heic-to");

  // Convertir archivo a ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Promise de conversion con timeout
  const conversionPromise = heicTo({
    blob: new Blob([arrayBuffer]),
    type: "image/jpeg",
    quality,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Conversion HEIC timeout - imagen muy grande o formato no soportado"));
    }, HEIC_CONVERSION_TIMEOUT);
  });

  // Usar Promise.race para aplicar timeout
  const jpegBlob = await Promise.race([conversionPromise, timeoutPromise]);

  // Crear nuevo nombre de archivo con extension .jpg
  const originalName = file.name;
  const newName = originalName.replace(/\.(heic|heif)$/i, ".jpg");

  // Crear nuevo File object
  return new File([jpegBlob], newName, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

/**
 * Procesa un archivo, convirtiendolo si es HEIC
 * @param file Archivo a procesar
 * @returns Archivo original o convertido a JPEG
 */
export async function processImageFile(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return convertHeicToJpeg(file);
  }
  return file;
}

/**
 * Procesa multiples archivos en paralelo
 * @param files Archivos a procesar
 * @returns Archivos procesados
 */
export async function processMultipleFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(processImageFile));
}
