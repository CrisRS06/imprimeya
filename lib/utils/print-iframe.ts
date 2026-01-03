/**
 * Utilidad de impresión usando iframe
 * Usa PIXELS en lugar de inches para compatibilidad con iOS Safari
 * iOS interpreta inches con DPI diferente (72 vs 96)
 */

export interface PrintPhotoData {
  imageUrl: string;
  x: number;      // en pixels (ya convertido desde inches × 96)
  y: number;      // en pixels
  width: number;  // en pixels
  height: number; // en pixels
}

export interface PrintPageData {
  photos: PrintPhotoData[];
}

// Constantes en pixels (Letter size @ 96 DPI)
const SHEET_WIDTH_PX = 816;   // 8.5in × 96
const SHEET_HEIGHT_PX = 1056; // 11in × 96

/**
 * Genera el HTML para impresión - TODO EN PIXELS
 */
function generatePrintHTML(pages: PrintPageData[], orderCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=${SHEET_WIDTH_PX}, initial-scale=1.0, shrink-to-fit=no">
      <title>Pedido ${orderCode}</title>
      <style>
        /* Reset total */
        *, *::before, *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: letter;
          margin: 0;
        }

        html {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          width: ${SHEET_WIDTH_PX}px;
          margin: 0;
          padding: 0;
          background: white;
        }

        .sheet {
          width: ${SHEET_WIDTH_PX}px;
          height: ${SHEET_HEIGHT_PX}px;
          position: relative;
          overflow: hidden;
          background: white;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .photo {
          position: absolute;
          object-fit: cover;
          max-width: none;
        }

        @media print {
          html, body {
            width: ${SHEET_WIDTH_PX}px;
            height: auto;
            overflow: hidden;
          }

          body > *:not(.sheet) {
            display: none !important;
          }
        }

        @media screen {
          body {
            background: #f0f0f0;
            padding: 20px;
          }
          .sheet {
            margin: 20px auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
        }
      </style>
    </head>
    <body>
      ${pages
        .map(
          (page) => `
        <div class="sheet">
          ${page.photos
            .map(
              (photo) => `
            <img
              class="photo"
              src="${photo.imageUrl}"
              crossorigin="anonymous"
              style="left:${photo.x}px;top:${photo.y}px;width:${photo.width}px;height:${photo.height}px;"
              onerror="this.style.display='none'"
            />
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
    </body>
    </html>
  `;
}

/**
 * Imprime usando iframe aislado
 * Funciona en todos los navegadores incluyendo iOS Safari
 */
export function printWithIframe(
  pages: PrintPageData[],
  orderCode: string
): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      resolve();
      return;
    }

    const html = generatePrintHTML(pages, orderCode);
    doc.open();
    doc.write(html);
    doc.close();

    const images = doc.querySelectorAll("img");
    let loadedCount = 0;
    const totalImages = images.length;

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Error al imprimir:", e);
        }
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 2000);
      }, 100);
    };

    if (totalImages === 0) {
      triggerPrint();
      return;
    }

    const onLoad = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        triggerPrint();
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        onLoad();
      } else {
        img.onload = onLoad;
        img.onerror = onLoad;
      }
    });

    // Timeout de seguridad
    setTimeout(triggerPrint, 10000);
  });
}
