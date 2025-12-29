/**
 * Utilidades para validacion de calidad de imagen
 */

export interface ValidationResult {
  isValid: boolean;
  quality: "excellent" | "acceptable" | "poor";
  width: number;
  height: number;
  dpi: number;
  maxRecommendedSize: string | null;
  message: string;
}

// Tamanos de impresion disponibles con requisitos de resolucion
export const PRINT_SIZES = {
  "4x6": { width: 4, height: 6, optimalPx: { w: 1200, h: 1800 }, minPx: { w: 600, h: 900 } },
  "5x7": { width: 5, height: 7, optimalPx: { w: 1500, h: 2100 }, minPx: { w: 750, h: 1050 } },
  "8x10": { width: 8, height: 10, optimalPx: { w: 2400, h: 3000 }, minPx: { w: 1200, h: 1500 } },
  "Carta": { width: 8.5, height: 11, optimalPx: { w: 2550, h: 3300 }, minPx: { w: 1275, h: 1650 } },
} as const;

export type PrintSizeName = keyof typeof PRINT_SIZES;

/**
 * Obtiene las dimensiones de una imagen
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen"));
    };

    img.src = url;
  });
}

/**
 * Calcula el DPI efectivo de una imagen para un tamano de impresion
 */
function calculateDPI(
  imageWidth: number,
  imageHeight: number,
  printWidthInches: number,
  printHeightInches: number
): number {
  // Considerar la orientacion de la imagen
  const isImagePortrait = imageHeight > imageWidth;
  const isPrintPortrait = printHeightInches > printWidthInches;

  let effectiveWidth: number;
  let effectiveHeight: number;

  if (isImagePortrait === isPrintPortrait) {
    effectiveWidth = imageWidth / printWidthInches;
    effectiveHeight = imageHeight / printHeightInches;
  } else {
    // La imagen tiene orientacion opuesta al tamano de impresion
    effectiveWidth = imageWidth / printHeightInches;
    effectiveHeight = imageHeight / printWidthInches;
  }

  // El DPI efectivo es el menor de los dos
  return Math.min(effectiveWidth, effectiveHeight);
}

/**
 * Determina el tamano maximo recomendado basado en la resolucion
 */
function getMaxRecommendedSize(
  imageWidth: number,
  imageHeight: number
): string | null {
  const sizes = Object.entries(PRINT_SIZES);
  let maxSize: string | null = null;

  for (const [name, specs] of sizes) {
    const dpi = calculateDPI(imageWidth, imageHeight, specs.width, specs.height);
    if (dpi >= 150) {
      maxSize = name;
    }
  }

  return maxSize;
}

/**
 * Valida la resolucion de una imagen
 */
export async function validateImageResolution(
  file: File,
  targetSize?: PrintSizeName
): Promise<ValidationResult> {
  try {
    const { width, height } = await getImageDimensions(file);

    // Si no hay tamano objetivo, validar para el tamano mas grande posible
    if (!targetSize) {
      const maxSize = getMaxRecommendedSize(width, height);

      if (!maxSize) {
        return {
          isValid: false,
          quality: "poor",
          width,
          height,
          dpi: 0,
          maxRecommendedSize: null,
          message: "Resolucion muy baja para impresion",
        };
      }

      targetSize = maxSize as PrintSizeName;
    }

    const specs = PRINT_SIZES[targetSize];
    const dpi = calculateDPI(width, height, specs.width, specs.height);

    let quality: ValidationResult["quality"];
    let message: string;

    if (dpi >= 300) {
      quality = "excellent";
      message = "Calidad excelente para impresion";
    } else if (dpi >= 200) {
      quality = "acceptable";
      message = "Calidad aceptable, posible perdida de detalle";
    } else if (dpi >= 150) {
      quality = "acceptable";
      message = "Calidad aceptable para este tamano";
    } else {
      quality = "poor";
      message = "Resolucion baja para este tamano";
    }

    const maxRecommendedSize = getMaxRecommendedSize(width, height);

    return {
      isValid: dpi >= 150,
      quality,
      width,
      height,
      dpi: Math.round(dpi),
      maxRecommendedSize,
      message,
    };
  } catch (error) {
    return {
      isValid: false,
      quality: "poor",
      width: 0,
      height: 0,
      dpi: 0,
      maxRecommendedSize: null,
      message: "Error al validar la imagen",
    };
  }
}

/**
 * Valida multiples imagenes
 */
export async function validateMultipleImages(
  files: File[],
  targetSize?: PrintSizeName
): Promise<ValidationResult[]> {
  return Promise.all(files.map((file) => validateImageResolution(file, targetSize)));
}
