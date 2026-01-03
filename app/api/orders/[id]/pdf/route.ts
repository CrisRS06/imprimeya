import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Determinar si estamos en desarrollo local o producción
const isDev = process.env.NODE_ENV === "development";

// URL base del sitio
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// GET /api/orders/[id]/pdf - Generar PDF de impresión
export async function GET(request: NextRequest, { params }: RouteParams) {
  let browser = null;

  try {
    const { id } = await params;
    const baseUrl = getBaseUrl();

    // Configurar Puppeteer según el entorno
    if (isDev) {
      // En desarrollo, usar Chrome local
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        // En macOS, Chrome suele estar en este path
        executablePath:
          process.platform === "darwin"
            ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            : process.platform === "win32"
              ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
              : "/usr/bin/google-chrome",
      });
    } else {
      // En producción (Vercel), usar chromium-min
      const executablePath = await chromium.executablePath(
        "https://github.com/nicholaschiasson/chromium-releases/releases/download/v136.0.7103.25/chromium-v136.0.7103.25-pack.tar"
      );

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: "shell",
      });
    }

    const page = await browser.newPage();

    // Navegar a la página de impresión con modo print-only
    const printUrl = `${baseUrl}/imprimir/${id}?pdf=true`;
    console.log(`[PDF] Generating PDF from: ${printUrl}`);

    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Esperar a que las imágenes se carguen
    await page.waitForSelector(".print-sheet", { timeout: 10000 });

    // Esperar un poco más para asegurar que las imágenes estén renderizadas
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generar PDF tamaño carta sin márgenes
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log(`[PDF] Generated PDF for order ${id}, size: ${pdf.length} bytes`);

    // Convertir Uint8Array a Buffer para NextResponse
    const pdfBuffer = Buffer.from(pdf);

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pedido-${id}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Error generando PDF", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  } finally {
    // IMPORTANTE: Siempre cerrar el browser para evitar memory leaks
    if (browser) {
      await browser.close();
    }
  }
}

// Configurar para Vercel
export const maxDuration = 30; // 30 segundos de timeout
export const dynamic = "force-dynamic";
