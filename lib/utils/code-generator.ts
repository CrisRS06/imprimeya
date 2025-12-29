import { customAlphabet } from "nanoid";

/**
 * Generador de codigos de pedido
 *
 * Usa un alfabeto restringido para evitar confusion entre caracteres:
 * - Sin 0, O, I, L, 1 (se confunden facilmente)
 * - Solo mayusculas y numeros faciles de leer
 */

// Alfabeto sin caracteres confusos
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Generador de codigos de 6 caracteres
const generateCode = customAlphabet(ALPHABET, 6);

/**
 * Genera un codigo de pedido unico
 * @returns Codigo de 6 caracteres (ej: "H7KM3P")
 */
export function generateOrderCode(): string {
  return generateCode();
}

/**
 * Valida el formato de un codigo de pedido
 * @param code Codigo a validar
 * @returns true si el formato es valido
 */
export function isValidOrderCode(code: string): boolean {
  if (!code || code.length !== 6) {
    return false;
  }

  const pattern = new RegExp(`^[${ALPHABET}]{6}$`);
  return pattern.test(code.toUpperCase());
}

/**
 * Normaliza un codigo de pedido (mayusculas, sin espacios)
 * @param code Codigo a normalizar
 * @returns Codigo normalizado
 */
export function normalizeOrderCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, "");
}

/**
 * Formatea un codigo para mostrar (con espacio en medio)
 * @param code Codigo a formatear
 * @returns Codigo formateado (ej: "H7K M3P")
 */
export function formatOrderCode(code: string): string {
  const normalized = normalizeOrderCode(code);
  if (normalized.length !== 6) {
    return normalized;
  }
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}
