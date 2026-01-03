/**
 * Utilidad de impresión usando iframe aislado
 * Elimina problemas de spillover al aislar completamente los estilos de impresión
 */

export interface PrintPhotoData {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintPageData {
  photos: PrintPhotoData[];
}

/**
 * Imprime páginas usando un iframe aislado con HTML mínimo
 * @param pages - Array de páginas, cada una con sus fotos posicionadas
 * @param orderCode - Código del pedido para el título
 * @returns Promise que resuelve cuando se abre el diálogo de impresión
 */
export function printWithIframe(
  pages: PrintPageData[],
  orderCode: string
): Promise<void> {
  return new Promise((resolve) => {
    // Crear iframe oculto
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

    // Generar HTML mínimo con estilos de impresión aislados
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido ${orderCode}</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 8.5in;
            margin: 0;
            padding: 0;
          }
          .sheet {
            width: 8.5in;
            height: 11in;
            position: relative;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .sheet:last-child {
            page-break-after: auto;
          }
          .photo {
            position: absolute;
            object-fit: cover;
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
                style="left:${photo.x}in;top:${photo.y}in;width:${photo.width}in;height:${photo.height}in;"
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
    `);
    doc.close();

    // Esperar a que todas las imágenes carguen antes de imprimir
    const images = doc.querySelectorAll("img");
    const imageCount = images.length;

    if (imageCount === 0) {
      // Sin imágenes, imprimir directamente
      triggerPrint();
      return;
    }

    let loadedCount = 0;
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount >= imageCount) {
        triggerPrint();
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        onImageLoad();
      } else {
        img.onload = onImageLoad;
        img.onerror = onImageLoad; // Continuar incluso si falla una imagen
      }
    });

    // Timeout de seguridad (10 segundos máximo de espera)
    const timeoutId = setTimeout(() => {
      triggerPrint();
    }, 10000);

    function triggerPrint() {
      clearTimeout(timeoutId);

      // Pequeño delay para asegurar renderizado
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Error al imprimir:", e);
        }

        // Limpiar iframe después de un tiempo
        setTimeout(() => {
          iframe.remove();
          resolve();
        }, 2000);
      }, 100);
    }
  });
}
