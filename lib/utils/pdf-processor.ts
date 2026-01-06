import { PDFDocument } from "pdf-lib";

// Letter size in PDF points (72 points per inch)
const LETTER_WIDTH = 612; // 8.5 inches
const LETTER_HEIGHT = 792; // 11 inches

/**
 * Converts base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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
 * Gets the number of pages in a PDF
 */
export async function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

/**
 * Scales all pages of a PDF to fit letter size (8.5x11") while maintaining aspect ratio
 * Content is centered on the page
 */
export async function fitToLetterSize(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
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
}

/**
 * Extracts selected pages from a PDF and creates a new PDF
 * @param pdfBytes - Original PDF as ArrayBuffer
 * @param pageNumbers - Array of 1-indexed page numbers to extract
 * @returns New PDF with only selected pages
 */
export async function extractPages(
  pdfBytes: ArrayBuffer,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();

  // Convert 1-indexed to 0-indexed and filter valid pages
  const totalPages = srcDoc.getPageCount();
  const validIndices = pageNumbers
    .map((n) => n - 1)
    .filter((i) => i >= 0 && i < totalPages);

  if (validIndices.length === 0) {
    throw new Error("No hay paginas validas para extraer");
  }

  // Copy selected pages to new document
  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);

  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return newDoc.save();
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
