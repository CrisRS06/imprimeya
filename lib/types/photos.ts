/**
 * Tipos compartidos para el flujo de fotos
 */

import type { ValidationResult } from "@/lib/utils/image-validation";

/**
 * Foto con cantidad para impresion
 * Usado en todo el flujo: upload -> layout -> papel -> resumen
 */
export interface PhotoWithQuantity {
  id: string;
  preview: string;
  name: string;
  quantity: number;
  storagePath?: string;  // Path en Supabase Storage (ej: "session123/uuid.jpg")
  publicUrl?: string;    // URL publica de Supabase Storage
  validation?: ValidationResult;
}

/**
 * Foto basica sin cantidad (para componentes de preview)
 */
export interface Photo {
  id: string;
  preview: string;
  name?: string;
  storagePath?: string;  // Path en Supabase Storage
  publicUrl?: string;    // URL publica de Supabase
}
