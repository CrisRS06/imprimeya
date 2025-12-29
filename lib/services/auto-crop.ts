/**
 * Auto-crop inteligente con deteccion de rostros y saliency
 * Utiliza face-api.js para rostros y smartcrop.js como fallback
 */

import smartcrop from "smartcrop";

export interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  method: "face" | "saliency" | "center";
}

export interface CropOptions {
  // Opción 1: Dimensiones específicas
  targetWidth?: number;
  targetHeight?: number;
  // Opción 2: Aspect ratio (si no se dan dimensiones)
  targetAspectRatio?: number;
  // Opciones adicionales
  minScale?: number;
  detectFaces?: boolean;
}

// Estado de carga de modelos
let modelsLoaded = false;
let modelsLoading = false;
let faceapi: typeof import("face-api.js") | null = null;

/**
 * Carga los modelos de face-api.js de forma lazy
 */
async function loadFaceApiModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelsLoading) {
    // Esperar a que termine la carga en progreso
    while (modelsLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return modelsLoaded;
  }

  modelsLoading = true;

  try {
    // Importar face-api.js de forma dinamica
    faceapi = await import("face-api.js");

    // Cargar modelo ligero de deteccion de rostros
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

    modelsLoaded = true;
    modelsLoading = false;
    return true;
  } catch (error) {
    console.warn("No se pudieron cargar los modelos de face-api.js:", error);
    modelsLoading = false;
    return false;
  }
}

/**
 * Carga una imagen desde URL y retorna un elemento HTMLImageElement
 */
async function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * Detecta rostros en una imagen usando face-api.js
 */
async function detectFaces(
  img: HTMLImageElement
): Promise<{ x: number; y: number; width: number; height: number }[]> {
  if (!faceapi || !modelsLoaded) {
    const loaded = await loadFaceApiModels();
    if (!loaded || !faceapi) return [];
  }

  try {
    const detections = await faceapi.detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      })
    );

    return detections.map((d) => ({
      x: d.box.x,
      y: d.box.y,
      width: d.box.width,
      height: d.box.height,
    }));
  } catch (error) {
    console.warn("Error detectando rostros:", error);
    return [];
  }
}

/**
 * Calcula el centro de multiples rostros detectados
 */
function calculateFaceCenter(
  faces: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number } {
  if (faces.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calcular el bounding box que contiene todos los rostros
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  faces.forEach((face) => {
    minX = Math.min(minX, face.x);
    minY = Math.min(minY, face.y);
    maxX = Math.max(maxX, face.x + face.width);
    maxY = Math.max(maxY, face.y + face.height);
  });

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
}

/**
 * Calcula el crop optimo basado en rostros detectados
 */
function calculateFaceCrop(
  imgWidth: number,
  imgHeight: number,
  faces: { x: number; y: number; width: number; height: number }[],
  targetWidth: number,
  targetHeight: number
): CropResult {
  const center = calculateFaceCenter(faces);
  const targetAspect = targetWidth / targetHeight;
  const imgAspect = imgWidth / imgHeight;

  let cropWidth: number;
  let cropHeight: number;

  // Determinar dimensiones del crop manteniendo aspect ratio
  if (imgAspect > targetAspect) {
    // Imagen mas ancha que el target
    cropHeight = imgHeight;
    cropWidth = cropHeight * targetAspect;
  } else {
    // Imagen mas alta que el target
    cropWidth = imgWidth;
    cropHeight = cropWidth / targetAspect;
  }

  // Centrar el crop en los rostros
  let x = center.x - cropWidth / 2;
  let y = center.y - cropHeight / 2;

  // Asegurar que el crop no se salga de la imagen
  x = Math.max(0, Math.min(imgWidth - cropWidth, x));
  y = Math.max(0, Math.min(imgHeight - cropHeight, y));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    confidence: 0.9, // Alta confianza cuando hay rostros
    method: "face",
  };
}

/**
 * Usa smartcrop.js para analisis de saliency
 */
async function detectSaliencyCrop(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): Promise<CropResult> {
  try {
    const result = await smartcrop.crop(img, {
      width: targetWidth,
      height: targetHeight,
      minScale: 1.0,
    });

    return {
      x: result.topCrop.x,
      y: result.topCrop.y,
      width: result.topCrop.width,
      height: result.topCrop.height,
      confidence: 0.7, // Confianza media para saliency
      method: "saliency",
    };
  } catch (error) {
    console.warn("Error en smartcrop:", error);
    // Fallback a centro
    return calculateCenterCrop(img.width, img.height, targetWidth, targetHeight);
  }
}

/**
 * Calcula un crop centrado simple (fallback)
 */
function calculateCenterCrop(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): CropResult {
  const targetAspect = targetWidth / targetHeight;
  const imgAspect = imgWidth / imgHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (imgAspect > targetAspect) {
    cropHeight = imgHeight;
    cropWidth = cropHeight * targetAspect;
  } else {
    cropWidth = imgWidth;
    cropHeight = cropWidth / targetAspect;
  }

  const x = (imgWidth - cropWidth) / 2;
  const y = (imgHeight - cropHeight) / 2;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    confidence: 0.5, // Confianza baja para centro
    method: "center",
  };
}

/**
 * Detecta el crop optimo para una imagen
 * Algoritmo:
 * 1. Si detectFaces está activo, intenta detectar rostros
 * 2. Si hay rostros, centra el crop en ellos
 * 3. Si no hay rostros, usa smartcrop para saliency
 * 4. Si falla, centra la imagen
 */
export async function detectOptimalCrop(
  imageUrl: string,
  options: CropOptions
): Promise<CropResult> {
  const { detectFaces: shouldDetectFaces = true } = options;

  try {
    const img = await loadImage(imageUrl);

    // Calcular targetWidth y targetHeight
    let targetWidth: number;
    let targetHeight: number;

    if (options.targetWidth && options.targetHeight) {
      // Usar dimensiones explícitas
      targetWidth = options.targetWidth;
      targetHeight = options.targetHeight;
    } else if (options.targetAspectRatio) {
      // Calcular dimensiones basadas en aspect ratio
      const imgAspect = img.width / img.height;
      if (imgAspect > options.targetAspectRatio) {
        // Imagen más ancha - usar altura completa
        targetHeight = img.height;
        targetWidth = targetHeight * options.targetAspectRatio;
      } else {
        // Imagen más alta - usar ancho completo
        targetWidth = img.width;
        targetHeight = targetWidth / options.targetAspectRatio;
      }
    } else {
      // Sin especificación - usar dimensiones originales
      targetWidth = img.width;
      targetHeight = img.height;
    }

    // Paso 1: Intentar deteccion de rostros (si está habilitado)
    if (shouldDetectFaces) {
      const faces = await detectFaces(img);

      if (faces.length > 0) {
        // Hay rostros - usar face-based crop
        return calculateFaceCrop(
          img.width,
          img.height,
          faces,
          targetWidth,
          targetHeight
        );
      }
    }

    // Paso 2: No hay rostros o detección deshabilitada - usar smartcrop
    return await detectSaliencyCrop(img, targetWidth, targetHeight);
  } catch (error) {
    console.error("Error en auto-crop:", error);
    // Fallback: crop centrado basico
    try {
      const img = await loadImage(imageUrl);
      let targetWidth = options.targetWidth || img.width;
      let targetHeight = options.targetHeight || img.height;

      if (options.targetAspectRatio && !options.targetWidth) {
        const imgAspect = img.width / img.height;
        if (imgAspect > options.targetAspectRatio) {
          targetHeight = img.height;
          targetWidth = targetHeight * options.targetAspectRatio;
        } else {
          targetWidth = img.width;
          targetHeight = targetWidth / options.targetAspectRatio;
        }
      }

      return calculateCenterCrop(
        img.width,
        img.height,
        targetWidth,
        targetHeight
      );
    } catch {
      // Ultimo fallback: devolver crop de toda la imagen
      return {
        x: 0,
        y: 0,
        width: options.targetWidth || 100,
        height: options.targetHeight || 100,
        confidence: 0,
        method: "center",
      };
    }
  }
}

/**
 * Aplica el crop a una imagen y retorna un canvas con el resultado
 */
export async function applyCrop(
  imageUrl: string,
  crop: CropResult
): Promise<HTMLCanvasElement> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear contexto 2D");
  }

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas;
}

/**
 * Obtiene la URL de datos de una imagen recortada
 */
export async function getCroppedImageUrl(
  imageUrl: string,
  crop: CropResult,
  format: "image/jpeg" | "image/png" = "image/jpeg",
  quality: number = 0.92
): Promise<string> {
  const canvas = await applyCrop(imageUrl, crop);
  return canvas.toDataURL(format, quality);
}

/**
 * Pre-carga los modelos de face-api.js para que esten listos
 */
export async function preloadModels(): Promise<boolean> {
  return loadFaceApiModels();
}

/**
 * Verifica si los modelos estan cargados
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}
