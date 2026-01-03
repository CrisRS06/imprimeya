/**
 * Calculador de precios para impresiones
 * Precios en colones costarricenses
 */

import type { PaperType, ProductType } from "@/lib/supabase/types";

// ===========================================
// PRECIOS BASE DE IMPRESIÓN (por página/hoja)
// ===========================================

// Costo de impresión por tipo (fotos y documentos)
export const PRINT_COSTS = {
  color: 100,      // Impresión a color
  blackWhite: 50,  // Impresión blanco y negro
};

// ===========================================
// RECARGOS POR TIPO DE PAPEL
// ===========================================

// Recargo adicional por tipo de papel especial (se suma al costo de impresión)
export const PAPER_SURCHARGES: Record<PaperType, number> = {
  bond_normal: 0,           // Sin recargo - papel estándar
  opalina: 200,             // Papel opalina
  cartulina_lino: 200,      // Papel lino
  sticker_semigloss: 200,   // Papel sticker
  fotografico: 400,         // Papel fotográfico
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



interface PriceCalculationInput {
  sizeName: string;
  paperType: PaperType;
  quantity: number;
  productType: ProductType;
  isColor?: boolean; // Para documentos: true = color, false = B&N
}

interface PriceBreakdown {
  basePrice: number;
  paperMultiplier: number;
  paperSurcharge: number;
  pricePerUnit: number;
  quantity: number;
  subtotal: number;
  total: number;
  formattedTotal: string;
  isColor?: boolean;
}

/**
 * Calcula el precio total de un pedido
 *
 * PRECIOS (por hoja):
 * - Impresión color: ₡100
 * - Impresión B&N: ₡50
 * - Recargo fotográfico: +₡400
 * - Recargo opalina/lino: +₡170
 * - Recargo sticker: +₡150
 * - Bond normal: sin recargo
 */
export function calculatePrice(input: PriceCalculationInput): PriceBreakdown {
  const {
    paperType,
    quantity,
    isColor = true,
  } = input;

  // Misma lógica para fotos y documentos: costo impresión + recargo papel
  const basePrice = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;
  const paperSurcharge = PAPER_SURCHARGES[paperType] || 0;
  const pricePerUnit = basePrice + paperSurcharge;

  // Subtotal (precio por unidad * cantidad)
  const subtotal = pricePerUnit * quantity;

  // Total
  const total = subtotal;

  return {
    basePrice,
    paperMultiplier: 1.0, // Legacy, ya no se usa
    paperSurcharge,
    pricePerUnit,
    quantity,
    subtotal,
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
 * Genera un resumen de precios para mostrar al usuario
 */
export function generatePriceSummary(breakdown: PriceBreakdown): string[] {
  const lines: string[] = [];

  lines.push(`${breakdown.quantity}x impresion @ ${formatPrice(breakdown.pricePerUnit)}`);

  return lines;
}
