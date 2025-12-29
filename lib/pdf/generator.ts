import { PDFDocument, rgb } from "pdf-lib";
import type { Order, PrintSize } from "@/lib/supabase/types";

// Constantes de impresion
const POINTS_PER_INCH = 72;
const BLEED_INCHES = 0.125; // Sangrado estandar
const SAFE_ZONE_INCHES = 0.25; // Zona segura

interface PrintSpecs {
  bleedPts: number;
  safeZonePts: number;
  widthPts: number;
  heightPts: number;
  trimWidth: number;
  trimHeight: number;
}

/**
 * Calcula las especificaciones de impresion
 */
function calculatePrintSpecs(printSize: PrintSize): PrintSpecs {
  const bleedPts = BLEED_INCHES * POINTS_PER_INCH;
  const safeZonePts = SAFE_ZONE_INCHES * POINTS_PER_INCH;

  // Dimensiones del trim (tamano final despues de cortar)
  const trimWidth = printSize.width_inches * POINTS_PER_INCH;
  const trimHeight = printSize.height_inches * POINTS_PER_INCH;

  // Dimensiones totales incluyendo bleed
  const widthPts = trimWidth + bleedPts * 2;
  const heightPts = trimHeight + bleedPts * 2;

  return {
    bleedPts,
    safeZonePts,
    widthPts,
    heightPts,
    trimWidth,
    trimHeight,
  };
}

/**
 * Dibuja marcas de corte en la pagina
 */
function drawCropMarks(
  page: ReturnType<PDFDocument["addPage"]>,
  specs: PrintSpecs
) {
  const { bleedPts, widthPts, heightPts } = specs;
  const markLength = 18; // 0.25 pulgadas
  const markOffset = 9; // Espacio entre marca y trim

  const color = rgb(0, 0, 0);
  const lineWidth = 0.5;

  // Esquina inferior izquierda
  // Linea horizontal
  page.drawLine({
    start: { x: 0, y: bleedPts },
    end: { x: bleedPts - markOffset, y: bleedPts },
    thickness: lineWidth,
    color,
  });
  // Linea vertical
  page.drawLine({
    start: { x: bleedPts, y: 0 },
    end: { x: bleedPts, y: bleedPts - markOffset },
    thickness: lineWidth,
    color,
  });

  // Esquina inferior derecha
  page.drawLine({
    start: { x: widthPts, y: bleedPts },
    end: { x: widthPts - bleedPts + markOffset, y: bleedPts },
    thickness: lineWidth,
    color,
  });
  page.drawLine({
    start: { x: widthPts - bleedPts, y: 0 },
    end: { x: widthPts - bleedPts, y: bleedPts - markOffset },
    thickness: lineWidth,
    color,
  });

  // Esquina superior izquierda
  page.drawLine({
    start: { x: 0, y: heightPts - bleedPts },
    end: { x: bleedPts - markOffset, y: heightPts - bleedPts },
    thickness: lineWidth,
    color,
  });
  page.drawLine({
    start: { x: bleedPts, y: heightPts },
    end: { x: bleedPts, y: heightPts - bleedPts + markOffset },
    thickness: lineWidth,
    color,
  });

  // Esquina superior derecha
  page.drawLine({
    start: { x: widthPts, y: heightPts - bleedPts },
    end: { x: widthPts - bleedPts + markOffset, y: heightPts - bleedPts },
    thickness: lineWidth,
    color,
  });
  page.drawLine({
    start: { x: widthPts - bleedPts, y: heightPts },
    end: { x: widthPts - bleedPts, y: heightPts - bleedPts + markOffset },
    thickness: lineWidth,
    color,
  });
}

/**
 * Genera un PDF listo para impresion
 */
export async function generatePrintReadyPDF(
  imageBuffer: Buffer,
  order: Order & { print_size?: PrintSize }
): Promise<Uint8Array> {
  // Crear documento PDF
  const pdfDoc = await PDFDocument.create();

  // Obtener especificaciones de impresion
  if (!order.print_size) {
    throw new Error("Tamano de impresion no especificado");
  }

  const specs = calculatePrintSpecs(order.print_size);

  // Determinar formato de imagen y embedirla
  let image;
  const uint8Array = new Uint8Array(imageBuffer);

  // Detectar formato por magic bytes
  if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8) {
    // JPEG
    image = await pdfDoc.embedJpg(uint8Array);
  } else if (
    uint8Array[0] === 0x89 &&
    uint8Array[1] === 0x50 &&
    uint8Array[2] === 0x4e &&
    uint8Array[3] === 0x47
  ) {
    // PNG
    image = await pdfDoc.embedPng(uint8Array);
  } else {
    throw new Error("Formato de imagen no soportado. Use JPEG o PNG.");
  }

  // Crear pagina con dimensiones incluyendo bleed
  const page = pdfDoc.addPage([specs.widthPts, specs.heightPts]);

  // Dibujar imagen extendida al bleed
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: specs.widthPts,
    height: specs.heightPts,
  });

  // Agregar marcas de corte
  drawCropMarks(page, specs);

  // Agregar metadatos
  pdfDoc.setTitle(`Pedido ${order.code}`);
  pdfDoc.setSubject(`Impresion ${order.print_size.name}`);
  pdfDoc.setProducer("ImprimeYA - Simple!");
  pdfDoc.setCreationDate(new Date());

  // Generar y retornar el PDF
  return pdfDoc.save();
}

/**
 * Genera un PDF para poster multi-hoja
 */
export async function generatePosterPDF(
  imageBuffer: Buffer,
  order: Order & { print_size?: PrintSize },
  rows: number,
  cols: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  if (!order.print_size) {
    throw new Error("Tamano de impresion no especificado");
  }

  const specs = calculatePrintSpecs(order.print_size);

  // Embedir imagen
  const uint8Array = new Uint8Array(imageBuffer);
  let image;

  if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8) {
    image = await pdfDoc.embedJpg(uint8Array);
  } else {
    image = await pdfDoc.embedPng(uint8Array);
  }

  // Calcular dimensiones de cada seccion
  const sectionWidth = specs.trimWidth;
  const sectionHeight = specs.trimHeight;

  // Dimensiones totales del poster
  const totalWidth = sectionWidth * cols;
  const totalHeight = sectionHeight * rows;

  // Crear una pagina por cada seccion
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const page = pdfDoc.addPage([specs.widthPts, specs.heightPts]);

      // Calcular offset de la imagen para esta seccion
      // Nota: PDF usa origen en esquina inferior izquierda
      const offsetX = -(col * sectionWidth) + specs.bleedPts;
      const offsetY =
        -(totalHeight - (row + 1) * sectionHeight) + specs.bleedPts;

      // Dibujar imagen escalada al poster completo
      page.drawImage(image, {
        x: offsetX,
        y: offsetY,
        width: totalWidth + specs.bleedPts * 2,
        height: totalHeight + specs.bleedPts * 2,
      });

      // Marcas de corte
      drawCropMarks(page, specs);

      // Agregar indicador de posicion
      page.drawText(`${row + 1}-${col + 1}`, {
        x: specs.widthPts - 30,
        y: 10,
        size: 8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  // Metadatos
  pdfDoc.setTitle(`Poster ${order.code} (${rows}x${cols})`);
  pdfDoc.setSubject(`Poster multi-hoja`);
  pdfDoc.setProducer("ImprimeYA - Simple!");

  return pdfDoc.save();
}
