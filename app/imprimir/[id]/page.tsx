"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLayoutById, LETTER_WIDTH, LETTER_HEIGHT } from "@/lib/config/photo-layouts";
import type { PhotoLayout } from "@/lib/supabase/types";
import {
  PrinterIcon,
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";

interface PrintData {
  order: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    productType: string;
    sizeName: string;
    paperType: string;
    paperDisplayName: string;
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
}: {
  layout: PhotoLayout;
  photos: string[];
  sheetNumber: number;
  totalSheets: number;
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
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
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

  const handlePrint = useCallback(() => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  }, []);

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
        <p className="text-amber-600">Layout no encontrado: {data.print.layoutId}</p>
        <p className="text-gray-500 text-sm">
          Este pedido puede haber sido creado con un layout antiguo.
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
          >
            {printing ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PrinterIcon className="w-4 h-4 mr-2" />
            )}
            Imprimir
          </Button>
        </div>
      </div>

      {/* Info del pedido - NO se imprime */}
      <div className="no-print bg-gray-50 border-b pt-16 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tipo:</span>
              <span className="ml-2 font-medium">{data.order.productType}</span>
            </div>
            <div>
              <span className="text-gray-500">Tamano:</span>
              <span className="ml-2 font-medium">{data.order.sizeName}</span>
            </div>
            <div>
              <span className="text-gray-500">Papel:</span>
              <span className="ml-2 font-medium">{data.order.paperDisplayName}</span>
            </div>
            <div>
              <span className="text-gray-500">Fotos:</span>
              <span className="ml-2 font-medium">
                {totalPhotos} en {sheetsNeeded} {sheetsNeeded === 1 ? "hoja" : "hojas"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor de hojas - estilos de pantalla con Tailwind, CSS global hace override en print */}
      <div className="print-sheets-container pt-28 pb-8 bg-gray-100">
        {sheets.map((sheetPhotos, index) => (
          <PrintSheet
            key={index}
            layout={layout}
            photos={sheetPhotos}
            sheetNumber={index}
            totalSheets={sheetsNeeded}
          />
        ))}
      </div>
    </>
  );
}
