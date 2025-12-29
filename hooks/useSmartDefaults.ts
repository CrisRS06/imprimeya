"use client";

import { useState, useEffect, useCallback } from "react";
import { detectOptimalCrop, preloadModels, type CropResult } from "@/lib/services/auto-crop";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";

export interface SmartDefaults {
  recommendedSize: PrintSizeName;
  recommendedCrop: CropResult | null;
  quality: "excellent" | "acceptable" | "poor";
  isProcessing: boolean;
  isReady: boolean;
  error: string | null;
  imageWidth: number;
  imageHeight: number;
  dpi: number;
}

interface UseSmartDefaultsOptions {
  targetSize?: PrintSizeName;
  autoProcess?: boolean;
}

/**
 * Calcula el DPI efectivo para un tamano dado
 */
function calculateDPI(
  imageWidth: number,
  imageHeight: number,
  printWidth: number,
  printHeight: number
): number {
  const isImagePortrait = imageHeight > imageWidth;
  const isPrintPortrait = printHeight > printWidth;

  let effectiveWidth: number;
  let effectiveHeight: number;

  if (isImagePortrait === isPrintPortrait) {
    effectiveWidth = imageWidth / printWidth;
    effectiveHeight = imageHeight / printHeight;
  } else {
    effectiveWidth = imageWidth / printHeight;
    effectiveHeight = imageHeight / printWidth;
  }

  return Math.min(effectiveWidth, effectiveHeight);
}

/**
 * Determina la calidad basada en DPI
 */
function getQuality(dpi: number): "excellent" | "acceptable" | "poor" {
  if (dpi >= 200) return "excellent";
  if (dpi >= 150) return "acceptable";
  return "poor";
}

/**
 * Sugiere el tamano optimo basado en resolucion y aspect ratio
 */
function suggestOptimalSize(
  imageWidth: number,
  imageHeight: number
): PrintSizeName {
  const imageAspect = imageWidth / imageHeight;
  const isPortrait = imageHeight > imageWidth;

  // Calcular score para cada tamano
  const scores: { size: PrintSizeName; score: number }[] = [];

  for (const [name, specs] of Object.entries(PRINT_SIZES)) {
    const printWidth = isPortrait ? Math.min(specs.width, specs.height) : Math.max(specs.width, specs.height);
    const printHeight = isPortrait ? Math.max(specs.width, specs.height) : Math.min(specs.width, specs.height);
    const printAspect = printWidth / printHeight;

    // Calcular DPI
    const dpi = calculateDPI(imageWidth, imageHeight, printWidth, printHeight);

    // Calcular match de aspect ratio (0-1, mayor es mejor)
    const aspectMatch = 1 - Math.abs(imageAspect - printAspect) / Math.max(imageAspect, printAspect);

    // Score combinado: prioriza calidad (DPI >= 200) y luego aspect ratio match
    let score = 0;

    if (dpi >= 300) {
      score = 100 + aspectMatch * 50; // Excelente calidad
    } else if (dpi >= 200) {
      score = 75 + aspectMatch * 40; // Muy buena calidad
    } else if (dpi >= 150) {
      score = 50 + aspectMatch * 30; // Aceptable
    } else {
      score = aspectMatch * 20; // Baja calidad, solo aspect ratio
    }

    scores.push({ size: name as PrintSizeName, score });
  }

  // Ordenar por score descendente
  scores.sort((a, b) => b.score - a.score);

  return scores[0].size;
}

/**
 * Carga las dimensiones de una imagen
 */
async function getImageDimensions(
  imageUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * Hook para obtener configuracion inteligente automatica
 */
export function useSmartDefaults(
  imageUrl: string | null,
  options: UseSmartDefaultsOptions = {}
): SmartDefaults & {
  recalculate: (newSize?: PrintSizeName) => Promise<void>;
  setTargetSize: (size: PrintSizeName) => void;
} {
  const { targetSize: initialTargetSize, autoProcess = true } = options;

  const [state, setState] = useState<SmartDefaults>({
    recommendedSize: initialTargetSize || "4x6",
    recommendedCrop: null,
    quality: "acceptable",
    isProcessing: false,
    isReady: false,
    error: null,
    imageWidth: 0,
    imageHeight: 0,
    dpi: 0,
  });

  const [targetSize, setTargetSize] = useState<PrintSizeName | undefined>(
    initialTargetSize
  );

  const processImage = useCallback(
    async (url: string, size?: PrintSizeName) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        // Pre-cargar modelos de face-api.js
        await preloadModels();

        // Obtener dimensiones de la imagen
        const { width, height } = await getImageDimensions(url);

        // Sugerir tamano optimo si no se especifica
        const recommendedSize = size || suggestOptimalSize(width, height);
        const sizeSpec = PRINT_SIZES[recommendedSize];

        // Determinar orientacion
        const isPortrait = height > width;
        const printWidth = isPortrait
          ? Math.min(sizeSpec.width, sizeSpec.height)
          : Math.max(sizeSpec.width, sizeSpec.height);
        const printHeight = isPortrait
          ? Math.max(sizeSpec.width, sizeSpec.height)
          : Math.min(sizeSpec.width, sizeSpec.height);

        // Calcular aspect ratio objetivo
        const targetAspect = printWidth / printHeight;

        // Detectar crop optimo
        const crop = await detectOptimalCrop(url, {
          targetWidth: Math.round(width * (width < height ? 1 : targetAspect)),
          targetHeight: Math.round(height * (width < height ? 1 / targetAspect : 1)),
        });

        // Calcular DPI
        const dpi = calculateDPI(width, height, printWidth, printHeight);
        const quality = getQuality(dpi);

        setState({
          recommendedSize,
          recommendedCrop: crop,
          quality,
          isProcessing: false,
          isReady: true,
          error: null,
          imageWidth: width,
          imageHeight: height,
          dpi: Math.round(dpi),
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          isReady: false,
          error: error instanceof Error ? error.message : "Error procesando imagen",
        }));
      }
    },
    []
  );

  const recalculate = useCallback(
    async (newSize?: PrintSizeName) => {
      if (imageUrl) {
        await processImage(imageUrl, newSize || targetSize);
      }
    },
    [imageUrl, targetSize, processImage]
  );

  const handleSetTargetSize = useCallback((size: PrintSizeName) => {
    setTargetSize(size);
  }, []);

  // Procesar automaticamente cuando cambia la imagen
  useEffect(() => {
    if (imageUrl && autoProcess) {
      processImage(imageUrl, targetSize);
    }
  }, [imageUrl, autoProcess, processImage, targetSize]);

  // Re-procesar cuando cambia el tamano objetivo
  useEffect(() => {
    if (imageUrl && targetSize && state.isReady) {
      processImage(imageUrl, targetSize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSize]);

  return {
    ...state,
    recalculate,
    setTargetSize: handleSetTargetSize,
  };
}

/**
 * Exportar la funcion de sugerencia de tamano para uso externo
 */
export { suggestOptimalSize };
