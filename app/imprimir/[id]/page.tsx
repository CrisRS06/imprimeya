"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLayoutById, LETTER_WIDTH, LETTER_HEIGHT } from "@/lib/config/photo-layouts";
import { formatPrice } from "@/lib/utils/price-calculator";
import { printWithIframe, type PrintPageData } from "@/lib/utils/print-iframe";
import type { PhotoLayout } from "@/lib/supabase/types";
import { toast } from "sonner";
import {
  PrinterIcon,
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";

interface PrintData {
  order: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    total: number;
    subtotal: number;
    pricePerUnit: number;
    printCost: number;
    paperSurcharge: number;
    productType: string;
    sizeName: string;
    paperType: string;
    paperDisplayName: string;
    isColor: boolean;
  };
  print: {
    layoutId: string;
    imageUrls: string[];
    photosWithQuantities: Array<{
      id: string;
      preview: string;
      name: string;
      quantity: number;
    }>;
    totalPhotos: number;
    fillMode: "fill" | "fit";
  };
}

// Expande fotos segun cantidad (ej: 2 fotos x 3 copias cada una = 6 slots)
function expandPhotos(
  imageUrls: string[],
  photosWithQuantities: Array<{ quantity: number }>
): string[] {
  if (photosWithQuantities.length === 0 || imageUrls.length === 0) {
    return imageUrls;
  }

  const expanded: string[] = [];
  photosWithQuantities.forEach((photo, index) => {
    const url = imageUrls[index];
    if (url) {
      for (let i = 0; i < (photo.quantity || 1); i++) {
        expanded.push(url);
      }
    }
  });
  return expanded;
}

// Componente que renderiza una hoja para imprimir
function PrintSheet({
  layout,
  photos,
  sheetNumber,
  totalSheets,
  fillMode,
}: {
  layout: PhotoLayout;
  photos: string[];
  sheetNumber: number;
  totalSheets: number;
  fillMode: "fill" | "fit";
}) {
  const { positions } = layout.layout_data;

  return (
    <div
      className="print-sheet"
      style={{
        width: `${LETTER_WIDTH}in`,
        height: `${LETTER_HEIGHT}in`,
        position: "relative",
        backgroundColor: "white",
        // Usar propiedades modernas de break (no legacy pageBreak*)
        breakAfter: sheetNumber < totalSheets - 1 ? "page" : "auto",
        breakInside: "avoid",
        // Evitar margin: auto que puede causar espacio vertical
        marginLeft: "auto",
        marginRight: "auto",
        marginTop: "0",
        marginBottom: "0",
      }}
    >
      {positions.map((pos, index) => {
        const photoUrl = photos[index];
        const hasPhoto = !!photoUrl;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${pos.x}in`,
              top: `${pos.y}in`,
              width: `${pos.width}in`,
              height: `${pos.height}in`,
              overflow: "hidden",
            }}
          >
            {hasPhoto ? (
              <img
                src={photoUrl}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: fillMode === "fit" ? "contain" : "cover",
                  backgroundColor: fillMode === "fit" ? "white" : undefined,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#f3f4f6",
                  border: "1px dashed #d1d5db",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);

  useEffect(() => {
    async function fetchPrintData() {
      try {
        const response = await fetch(`/api/orders/${id}/print`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Error cargando datos");
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    fetchPrintData();
  }, [id]);

  const handleMarkDelivered = useCallback(async () => {
    if (!data) return;

    setMarkingDelivered(true);
    try {
      const response = await fetch(`/api/orders/${data.order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error actualizando estado");
      }

      toast.success("Pedido marcado como entregado");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al marcar como entregado");
      setMarkingDelivered(false);
    }
  }, [data, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-white">
        <AlertCircleIcon className="w-12 h-12 text-red-500" />
        <p className="text-red-600">{error || "Error cargando datos"}</p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const layout = getLayoutById(data.print.layoutId);

  if (!layout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-white">
        <AlertCircleIcon className="w-12 h-12 text-amber-500" />
        <p className="text-amber-600">
          Layout no encontrado: {data.print.layoutId || "(sin especificar)"}
        </p>
        <p className="text-gray-500 text-sm">
          {data.print.layoutId
            ? "Este pedido puede haber sido creado con un layout antiguo."
            : "Este pedido se creo sin seleccionar un layout."}
        </p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  // Expandir fotos segun cantidades
  const expandedPhotos = expandPhotos(
    data.print.imageUrls,
    data.print.photosWithQuantities
  );

  // Calcular hojas necesarias
  const photosPerSheet = layout.photos_per_sheet;
  const totalPhotos = expandedPhotos.length;
  const sheetsNeeded = Math.ceil(totalPhotos / photosPerSheet);

  // Dividir fotos en hojas
  const sheets: string[][] = [];
  for (let i = 0; i < sheetsNeeded; i++) {
    const start = i * photosPerSheet;
    const end = start + photosPerSheet;
    sheets.push(expandedPhotos.slice(start, end));
  }

  // Handler de impresión usando iframe aislado
  const handlePrint = async () => {
    setPrinting(true);

    // Convertir inches a pixels (96 DPI) para compatibilidad iOS Safari
    const DPI = 96;
    const pages: PrintPageData[] = sheets.map((sheetPhotos) => ({
      photos: layout.layout_data.positions
        .map((pos, idx) => ({
          imageUrl: sheetPhotos[idx] || "",
          x: pos.x * DPI,
          y: pos.y * DPI,
          width: pos.width * DPI,
          height: pos.height * DPI,
        }))
        .filter((p) => p.imageUrl),
    }));

    try {
      await printWithIframe(pages, data.order.code);
    } catch (err) {
      toast.error("Error al imprimir");
      console.error(err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      {/* Barra de controles - NO se imprime */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900">
                Pedido {data.order.code}
              </h1>
              <p className="text-sm text-gray-500">
                {layout.display_name} - {sheetsNeeded} {sheetsNeeded === 1 ? "hoja" : "hojas"}
              </p>
            </div>
          </div>

          <Button
            onClick={handlePrint}
            disabled={printing}
            size="lg"
            className="px-6"
          >
            {printing ? (
              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <PrinterIcon className="w-5 h-5 mr-2" />
            )}
            Imprimir
          </Button>
        </div>
      </div>

      {/* Info del pedido y acciones - NO se imprime */}
      <div className="no-print bg-gray-50 border-b pt-20 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Tipo de papel - PROMINENTE */}
          <div className="bg-amber-100 border-2 border-amber-400 rounded-xl px-6 py-4 mb-4">
            <p className="text-amber-700 text-sm font-medium">USAR PAPEL</p>
            <p className="text-3xl font-bold text-amber-900 uppercase tracking-wide">
              {data.order.paperDisplayName}
            </p>
          </div>

          {/* Otros detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Tipo:</span>
              <span className="ml-2 font-medium">{data.order.productType}</span>
            </div>
            <div>
              <span className="text-gray-500">Tamano:</span>
              <span className="ml-2 font-medium">{data.order.sizeName}</span>
            </div>
            <div>
              <span className="text-gray-500">Hojas:</span>
              <span className="ml-2 font-medium">
                {sheetsNeeded} {sheetsNeeded === 1 ? "hoja" : "hojas"} ({totalPhotos} fotos)
              </span>
            </div>
          </div>

          {/* Precio y boton de entregado */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="bg-emerald-50 rounded-xl px-4 sm:px-6 py-4 w-full sm:w-auto sm:min-w-[280px]">
              <p className="text-sm text-emerald-600 font-medium mb-3">
                Desglose ({sheetsNeeded} {sheetsNeeded === 1 ? "hoja" : "hojas"})
              </p>
              <div className="text-sm space-y-2 font-mono">
                <div className="flex justify-between text-emerald-700">
                  <span>Impresion {data.order.isColor ? "color" : "B/N"}</span>
                  <span>
                    {formatPrice(data.order.printCost)} × {sheetsNeeded} = {formatPrice(data.order.printCost * sheetsNeeded)}
                  </span>
                </div>
                {data.order.paperSurcharge > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Papel {data.order.paperDisplayName}</span>
                    <span>
                      {formatPrice(data.order.paperSurcharge)} × {sheetsNeeded} = {formatPrice(data.order.paperSurcharge * sheetsNeeded)}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-emerald-300 mt-3 pt-3 flex justify-between items-center">
                <span className="text-emerald-700 font-bold">TOTAL:</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatPrice(data.order.total)}
                </span>
              </div>
            </div>

            {data.order.status !== "delivered" && (
              <Button
                onClick={handleMarkDelivered}
                disabled={markingDelivered}
                className="h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold rounded-xl"
              >
                {markingDelivered ? (
                  <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                )}
                Marcar como Entregado
              </Button>
            )}

            {data.order.status === "delivered" && (
              <div className="bg-gray-100 rounded-xl px-6 py-3 text-center">
                <p className="text-sm text-gray-500">Estado</p>
                <p className="text-lg font-semibold text-gray-700">Ya entregado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenedor de hojas - con lazy loading en imagenes */}
      <div className="print-sheets-container pt-28 pb-8 bg-gray-100">
        {sheets.map((sheetPhotos, index) => (
          <PrintSheet
            key={index}
            layout={layout}
            photos={sheetPhotos}
            sheetNumber={index}
            totalSheets={sheetsNeeded}
            fillMode={data.print.fillMode}
          />
        ))}
      </div>
    </>
  );
}
