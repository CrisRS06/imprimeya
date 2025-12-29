/**
 * Calculador de precios para impresiones
 * Precios en colones costarricenses
 */

import type { PaperType, ProductType } from "@/lib/supabase/types";

// ===========================================
// PRECIOS BASE DE IMPRESIÓN (por página/hoja)
// ===========================================

// Costo de impresión por tipo (documentos)
export const PRINT_COSTS = {
  color: 100,      // Impresión a color
  blackWhite: 50,  // Impresión blanco y negro
};

// Costo de impresión fotográfica (incluye papel fotográfico)
export const PHOTO_PRINT_COST = 500;

// ===========================================
// RECARGOS POR TIPO DE PAPEL
// ===========================================

// Recargo adicional por tipo de papel especial (se suma al costo de impresión)
export const PAPER_SURCHARGES: Record<PaperType, number> = {
  bond_normal: 0,           // Sin recargo - papel estándar
  opalina: 170,             // Papel opalina suelto
  cartulina_lino: 170,      // Papel lino (mismo precio que opalina)
  sticker_semigloss: 150,   // Papel sticker
  fotografico: 0,           // El costo ya está incluido en PHOTO_PRINT_COST
};

// Multiplicadores legacy (mantenido para compatibilidad)
export const PAPER_MULTIPLIERS: Record<PaperType, number> = {
  bond_normal: 1.0,
  opalina: 1.0,
  cartulina_lino: 1.0,
  sticker_semigloss: 1.0,
  fotografico: 1.0,
};

// Nombres de papeles en español
export const PAPER_NAMES: Record<PaperType, string> = {
  bond_normal: "Bond Normal",
  opalina: "Opalina",
  cartulina_lino: "Cartulina Lino",
  sticker_semigloss: "Sticker",
  fotografico: "Fotográfico",
};

// Precios adicionales
export const ADDITIONAL_COSTS = {
  // Recargo por poster (por hoja adicional)
  posterSheetExtra: 300,
  // Recargo por collage premium
  premiumCollage: 500,
  // Recargo por ayuda manual
  manualHelp: 500,
};

// ===========================================
// PRECIOS POR TAMAÑO (para fotos)
// Todas las fotos en papel fotográfico = 500
// ===========================================
export const SIZE_PRICES: Record<string, number> = {
  "4x6": PHOTO_PRINT_COST,
  "5x7": PHOTO_PRINT_COST,
  "8x10": PHOTO_PRINT_COST,
  Carta: PHOTO_PRINT_COST,
};

interface PriceCalculationInput {
  sizeName: string;
  paperType: PaperType;
  quantity: number;
  productType: ProductType;
  posterRows?: number;
  posterCols?: number;
  isPremiumCollage?: boolean;
  needsManualHelp?: boolean;
  isColor?: boolean; // Para documentos: true = color, false = B&N
}

interface PriceBreakdown {
  basePrice: number;
  paperMultiplier: number;
  paperSurcharge: number;
  pricePerUnit: number;
  quantity: number;
  subtotal: number;
  posterExtra: number;
  premiumExtra: number;
  helpExtra: number;
  total: number;
  formattedTotal: string;
  isColor?: boolean;
}

/**
 * Calcula el precio total de un pedido
 *
 * PRECIOS:
 * - Fotos (papel fotográfico): ₡500 por impresión
 * - Documentos color: ₡100 por página + recargo papel
 * - Documentos B&N: ₡50 por página + recargo papel
 * - Recargo opalina/lino: +₡170
 * - Recargo sticker: +₡150
 */
export function calculatePrice(input: PriceCalculationInput): PriceBreakdown {
  const {
    sizeName,
    paperType,
    quantity,
    productType,
    posterRows = 1,
    posterCols = 1,
    isPremiumCollage = false,
    needsManualHelp = false,
    isColor = true,
  } = input;

  let basePrice: number;
  let paperSurcharge: number = 0;
  let pricePerUnit: number;

  if (productType === "photo") {
    // FOTOS: Precio fijo de ₡500 (incluye papel fotográfico)
    basePrice = PHOTO_PRINT_COST;
    paperSurcharge = 0;
    pricePerUnit = basePrice;
  } else {
    // DOCUMENTOS: Costo de impresión + recargo de papel
    basePrice = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;
    paperSurcharge = PAPER_SURCHARGES[paperType] || 0;
    pricePerUnit = basePrice + paperSurcharge;
  }

  // Calcular extras
  let posterExtra = 0;
  let premiumExtra = 0;
  let helpExtra = 0;

  // Extra por poster multi-hoja
  if (productType === "poster") {
    const totalSheets = posterRows * posterCols;
    if (totalSheets > 1) {
      posterExtra = (totalSheets - 1) * ADDITIONAL_COSTS.posterSheetExtra;
    }
  }

  // Extra por ayuda manual
  if (needsManualHelp) {
    helpExtra = ADDITIONAL_COSTS.manualHelp;
  }

  // Subtotal (precio por unidad * cantidad)
  const subtotal = pricePerUnit * quantity;

  // Total con extras
  const total = subtotal + posterExtra + premiumExtra + helpExtra;

  return {
    basePrice,
    paperMultiplier: 1.0, // Legacy, ya no se usa
    paperSurcharge,
    pricePerUnit,
    quantity,
    subtotal,
    posterExtra,
    premiumExtra,
    helpExtra,
    total,
    formattedTotal: formatPrice(total),
    isColor,
  };
}

/**
 * Calcula precio para documentos específicamente
 */
export function calculateDocumentPrice(
  pageCount: number,
  isColor: boolean,
  paperType: PaperType
): PriceBreakdown {
  return calculatePrice({
    sizeName: "Carta",
    paperType,
    quantity: pageCount,
    productType: "document",
    isColor,
  });
}

/**
 * Formatea un precio en colones
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Obtiene el precio base formateado para un tamano
 */
export function getBasePriceForSize(sizeName: string): string {
  const price = SIZE_PRICES[sizeName];
  if (!price) return "-";
  return formatPrice(price);
}

/**
 * Obtiene el precio con papel formateado
 */
export function getPriceWithPaper(sizeName: string, paperType: PaperType): string {
  const basePrice = SIZE_PRICES[sizeName] || 0;
  const multiplier = PAPER_MULTIPLIERS[paperType] || 1.0;
  return formatPrice(Math.round(basePrice * multiplier));
}

/**
 * Genera un resumen de precios para mostrar al usuario
 */
export function generatePriceSummary(breakdown: PriceBreakdown): string[] {
  const lines: string[] = [];

  lines.push(`${breakdown.quantity}x impresion @ ${formatPrice(breakdown.pricePerUnit)}`);

  if (breakdown.posterExtra > 0) {
    lines.push(`Hojas adicionales: +${formatPrice(breakdown.posterExtra)}`);
  }

  if (breakdown.premiumExtra > 0) {
    lines.push(`Plantilla premium: +${formatPrice(breakdown.premiumExtra)}`);
  }

  if (breakdown.helpExtra > 0) {
    lines.push(`Asistencia manual: +${formatPrice(breakdown.helpExtra)}`);
  }

  return lines;
}
