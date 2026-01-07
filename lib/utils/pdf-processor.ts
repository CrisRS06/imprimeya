import { PDFDocument } from "pdf-lib";

// Letter size in PDF points (72 points per inch)
const LETTER_WIDTH = 612; // 8.5 inches
const LETTER_HEIGHT = 792; // 11 inches

/**
 * Error específico para base64 inválido
 */
export class InvalidBase64Error extends Error {
  constructor() {
    super("El documento guardado esta corrupto. Por favor vuelve a subirlo.");
    this.name = "InvalidBase64Error";
  }
}

/**
 * Converts base64 string to ArrayBuffer
 * @throws {InvalidBase64Error} Si el base64 es inválido
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Validate base64 before attempting decode
  if (!base64 || typeof base64 !== "string") {
    throw new InvalidBase64Error();
  }

  // Check for valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64)) {
    throw new InvalidBase64Error();
  }

  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    throw new InvalidBase64Error();
  }
}

/**
 * Converts ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Error específico para PDFs protegidos
 */
export class EncryptedPdfError extends Error {
  constructor() {
    super("Este PDF esta protegido con contrasena. Por favor usa un PDF sin proteccion.");
    this.name = "EncryptedPdfError";
  }
}

/**
 * Gets the number of pages in a PDF
 * @throws {EncryptedPdfError} Si el PDF está encriptado
 */
export async function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (error) {
    // pdf-lib lanza error si el PDF está encriptado y requiere contraseña
    if (error instanceof Error &&
        (error.message.includes("encrypt") ||
         error.message.includes("password") ||
         error.message.includes("protected"))) {
      throw new EncryptedPdfError();
    }
    throw error;
  }
}

/**
 * Parses a page range string into an array of page numbers
 * @param input - Range string like "1-5, 8, 10-12"
 * @param maxPages - Maximum valid page number
 * @returns Array of 1-indexed page numbers sorted ascending
 */
export function parsePageRanges(input: string, maxPages: number): number[] {
  if (!input.trim()) return [];

  const selected = new Set<number>();
  const parts = input.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(end, maxPages); i++) {
          selected.add(i);
        }
      }
    } else {
      const page = Number(part);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        selected.add(page);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Converts an array of page numbers to a compact range string
 * @param pages - Array of page numbers [1, 2, 3, 5, 7, 8, 9]
 * @returns Compact string like "1-3, 5, 7-9"
 */
export function pagesToRangeString(pages: number[]): string {
  if (pages.length === 0) return "";

  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }

  return ranges.join(", ");
}

/**
 * Error específico para errores de escalado PDF
 */
export class PdfScalingError extends Error {
  constructor(message?: string) {
    super(message || "Error al ajustar el documento al tamano carta. Intenta con otro PDF.");
    this.name = "PdfScalingError";
  }
}

/**
 * Scales all pages of a PDF to fit letter size (8.5x11") while maintaining aspect ratio
 * Content is centered on the page
 * @throws {PdfScalingError} Si hay error al escalar
 */
export async function fitToLetterSize(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();

      // Skip if already letter size
      if (Math.abs(width - LETTER_WIDTH) < 1 && Math.abs(height - LETTER_HEIGHT) < 1) {
        continue;
      }

      // Calculate scale to fit within letter size while maintaining aspect ratio
      const scaleX = LETTER_WIDTH / width;
      const scaleY = LETTER_HEIGHT / height;
      const scale = Math.min(scaleX, scaleY); // Fit, don't crop

      // Scale the content
      page.scaleContent(scale, scale);

      // Set page size to letter
      page.setSize(LETTER_WIDTH, LETTER_HEIGHT);

      // Center the content
      const newWidth = width * scale;
      const newHeight = height * scale;
      const offsetX = (LETTER_WIDTH - newWidth) / 2;
      const offsetY = (LETTER_HEIGHT - newHeight) / 2;
      page.translateContent(offsetX, offsetY);
    }

    return pdfDoc.save();
  } catch (error) {
    if (error instanceof PdfScalingError) throw error;
    throw new PdfScalingError();
  }
}

/**
 * Error específico para errores de extracción de páginas
 */
export class PageExtractionError extends Error {
  constructor(message?: string) {
    super(message || "Error al extraer las paginas seleccionadas. Intenta con otro PDF.");
    this.name = "PageExtractionError";
  }
}

/**
 * Extracts selected pages from a PDF and creates a new PDF
 * @param pdfBytes - Original PDF as ArrayBuffer
 * @param pageNumbers - Array of 1-indexed page numbers to extract
 * @returns New PDF with only selected pages
 * @throws {PageExtractionError} Si hay error al extraer páginas
 */
export async function extractPages(
  pdfBytes: ArrayBuffer,
  pageNumbers: number[]
): Promise<Uint8Array> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();

    // Convert 1-indexed to 0-indexed and filter valid pages
    const totalPages = srcDoc.getPageCount();
    const validIndices = pageNumbers
      .map((n) => n - 1)
      .filter((i) => i >= 0 && i < totalPages);

    if (validIndices.length === 0) {
      throw new PageExtractionError("No hay paginas validas para extraer");
    }

    // Copy selected pages to new document
    const copiedPages = await newDoc.copyPages(srcDoc, validIndices);

    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    return newDoc.save();
  } catch (error) {
    if (error instanceof PageExtractionError) throw error;
    throw new PageExtractionError();
  }
}

/**
 * Processes a PDF: extracts selected pages and fits them to letter size
 * @param pdfBytes - Original PDF as ArrayBuffer
 * @param selectedPages - Array of 1-indexed page numbers to include
 * @returns Processed PDF ready for printing
 */
export async function processPdfForPrint(
  pdfBytes: ArrayBuffer,
  selectedPages: number[]
): Promise<Uint8Array> {
  // First extract selected pages
  const extractedPdf = await extractPages(pdfBytes, selectedPages);

  // Then fit to letter size
  const fittedPdf = await fitToLetterSize(extractedPdf.buffer as ArrayBuffer);

  return fittedPdf;
}
