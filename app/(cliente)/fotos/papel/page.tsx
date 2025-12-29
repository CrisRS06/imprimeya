"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  FileIcon,
  PrinterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { PaperSelector } from "@/components/fotos/PaperSelector";
import { LayoutPreviewCompact } from "@/components/fotos/LayoutPreview";
import type { PaperType, PhotoLayout } from "@/lib/supabase/types";
import { getLayoutById, calculateSheetsNeeded } from "@/lib/config/photo-layouts";
import { PAPERS, getRecommendedPaper } from "@/lib/config/papers";
import type { PhotoWithQuantity } from "@/lib/types/photos";

export default function FotosPapelPage() {
  const router = useRouter();
  const { state, setPrintOptions } = useOrder();
  const [photos, setPhotos] = useState<PhotoWithQuantity[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<PhotoLayout | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PaperType>("fotografico");

  // Cargar datos desde sessionStorage
  useEffect(() => {
    // Fotos con cantidades
    const storedPhotos = sessionStorage.getItem("uploadedPhotos");
    if (storedPhotos) {
      try {
        const parsed = JSON.parse(storedPhotos) as PhotoWithQuantity[];
        setPhotos(parsed.map((p) => ({ ...p, quantity: p.quantity || 1 })));
      } catch {
        // fallback
      }
    }

    // Layout
    const layoutId = sessionStorage.getItem("selectedLayoutId");
    if (layoutId) {
      const layout = getLayoutById(layoutId);
      if (layout) {
        setSelectedLayout(layout);
        // Recomendar papel fotografico para fotos
        const recommended = getRecommendedPaper("photo");
        if (recommended) {
          setSelectedPaper(recommended.code);
        }
      }
    }
  }, []);

  // Calcular cantidad total de fotos
  const totalQuantity = useMemo(() => {
    return photos.reduce((sum, p) => sum + (p.quantity || 1), 0);
  }, [photos]);

  const handleContinue = () => {
    if (!selectedLayout || !selectedPaper) return;

    // Guardar papel seleccionado
    sessionStorage.setItem("selectedPaper", selectedPaper);

    // Calcular hojas necesarias basado en totalQuantity
    const sheetsCount = calculateSheetsNeeded(totalQuantity, selectedLayout.photos_per_sheet);

    // Guardar en sessionStorage para el resumen
    sessionStorage.setItem("sheetsCount", sheetsCount.toString());
    sessionStorage.setItem("photoQuantity", totalQuantity.toString());

    // Actualizar contexto (compatibilidad con codigo existente)
    setPrintOptions({
      paperType: selectedPaper as PaperType,
      quantity: sheetsCount,
    });

    // Navegar al resumen
    router.push("/resumen");
  };

  // Si no hay layout seleccionado, redirigir
  if (!selectedLayout) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-white p-4">
        <div className="text-center">
          <FileIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Selecciona un layout primero
          </h2>
          <p className="text-gray-500 mb-6">
            Debes elegir el tamano y layout de las fotos
          </p>
          <Button onClick={() => router.push("/fotos/layout")}>
            Elegir layout
          </Button>
        </div>
      </div>
    );
  }

  const sheetsCount = calculateSheetsNeeded(totalQuantity, selectedLayout.photos_per_sheet);

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/fotos/layout")}
            className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black">Tipo de papel</h1>
            <p className="text-sm text-gray-400">Paso 3 de 3</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <PrinterIcon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-6 pb-6">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-primary" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Resumen del pedido */}
        <section className="px-4 pb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tu pedido</h3>
            <div className="flex gap-4">
              {/* Mini preview */}
              <div className="w-20 flex-shrink-0">
                <LayoutPreviewCompact
                  layout={selectedLayout}
                  photos={photos}
                  overrideQuantity={photos.length === 1 ? totalQuantity : undefined}
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {selectedLayout.display_name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {totalQuantity} {totalQuantity === 1 ? "foto" : "fotos"} en total
                </div>
                <div className="text-sm font-medium text-primary mt-2">
                  {sheetsCount} {sheetsCount === 1 ? "hoja" : "hojas"} a imprimir
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Selector de papel */}
        <section className="px-4 pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Elige el tipo de papel
          </h3>
          <PaperSelector
            productType="photo"
            selectedPaper={selectedPaper}
            onSelect={setSelectedPaper}
          />
        </section>
      </div>

      {/* Continue Button */}
      <section className="px-4 pb-8 mt-auto bg-white border-t border-gray-100 pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedPaper}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-2xl transition-all",
            !selectedPaper && "bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200"
          )}
        >
          Ver resumen
          <ChevronRightIcon className="w-5 h-5 ml-2" />
        </Button>
      </section>
    </div>
  );
}
