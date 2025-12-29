"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import { QualityIndicator, QualityBar } from "@/components/feedback/QualityIndicator";
import { PreviewPageSkeleton, ProcessingOverlay } from "@/components/feedback/LoadingStates";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SparklesIcon,
  ZoomInIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductType } from "@/lib/supabase/types";

// Cargar FabricCanvas solo en cliente
const FabricCanvas = dynamic(
  () => import("@/components/editor/FabricCanvas").then((mod) => mod.FabricCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-2xl">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

const sizeOptions: { value: PrintSizeName; label: string; price: number }[] = [
  { value: "4x6", label: '4x6"', price: 500 },
  { value: "5x7", label: '5x7"', price: 800 },
  { value: "8x10", label: '8x10"', price: 1500 },
  { value: "Carta", label: "Carta", price: 1200 },
];

function PreviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setPrintOptions } = useOrder();

  const productType = (searchParams.get("type") as ProductType) || state.productType;
  const [selectedSize, setSelectedSize] = useState<PrintSizeName>("4x6");
  const [mode, setMode] = useState<"fit" | "fill">("fill");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Obtener imagen a editar
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Cargar desde sessionStorage
    const savedFiles = sessionStorage.getItem("uploadedFiles");
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles);
        if (files.length > 0) {
          setPreviewUrl(files[0].preview);
        }
      } catch {
        // Si falla, intentar desde context
        if (state.images[0]?.preview) {
          setPreviewUrl(state.images[0].preview);
        }
      }
    } else if (state.images[0]?.preview) {
      setPreviewUrl(state.images[0].preview);
    }

    // Si no hay imagen, redirigir
    if (!savedFiles && state.images.length === 0) {
      router.push("/nuevo");
    }
  }, [state.images, router]);

  // Smart defaults - auto-crop y tamano recomendado
  const smartDefaults = useSmartDefaults(previewUrl, {
    targetSize: selectedSize,
    autoProcess: true,
  });

  // Actualizar tamano seleccionado cuando smart defaults sugiera uno mejor
  useEffect(() => {
    if (smartDefaults.isReady && !state.printOptions.sizeName) {
      setSelectedSize(smartDefaults.recommendedSize);
    }
  }, [smartDefaults.isReady, smartDefaults.recommendedSize, state.printOptions.sizeName]);

  const handleSizeChange = (size: PrintSizeName) => {
    setSelectedSize(size);
    setPrintOptions({ sizeName: size });
    smartDefaults.setTargetSize(size);
  };

  const handleContinue = () => {
    setPrintOptions({ sizeName: selectedSize });
    router.push(`/opciones?type=${productType}`);
  };

  if (!previewUrl) {
    return <PreviewPageSkeleton />;
  }

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm">Atras</span>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Vista previa</h1>
        <div className="w-16" />
      </header>

      {/* Smart Badge */}
      <AnimatePresence>
        {smartDefaults.isReady && smartDefaults.recommendedCrop?.method === "face" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-violet-50 to-sky-50 rounded-full">
              <SparklesIcon className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-medium text-violet-700">
                Centrado inteligente aplicado
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <main className="flex-1 px-4 pb-4">
        <div className="relative">
          {/* Canvas con auto-crop aplicado */}
          <FabricCanvas
            imageUrl={previewUrl}
            sizeName={selectedSize}
            mode={mode}
            showGuides={showAdvanced}
            autoCrop={smartDefaults.recommendedCrop}
            className="mb-4"
          />

          {/* Processing overlay */}
          <AnimatePresence>
            {smartDefaults.isProcessing && (
              <ProcessingOverlay
                message="Analizando tu foto..."
                className="rounded-2xl"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Size Selector - Chips horizontales */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Tamano de impresion
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {sizeOptions.map((option, index) => {
              const isRecommended = option.value === smartDefaults.recommendedSize;
              const isSelected = option.value === selectedSize;

              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSizeChange(option.value)}
                  className={cn(
                    "relative flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all min-w-[80px]",
                    isSelected
                      ? "border-sky-500 bg-sky-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  {isRecommended && !isSelected && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-violet-500 text-white text-[10px] font-medium rounded-full">
                      Sugerido
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-base font-semibold",
                      isSelected ? "text-sky-700" : "text-gray-700"
                    )}
                  >
                    {option.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isSelected ? "text-sky-600" : "text-gray-500"
                    )}
                  >
                    {option.price.toLocaleString()}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quality Indicator */}
        <AnimatePresence mode="wait">
          {smartDefaults.isReady && (
            <motion.div
              key={selectedSize}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <QualityIndicator
                quality={smartDefaults.quality}
                dpi={smartDefaults.dpi}
                suggestedSize={
                  smartDefaults.quality === "poor"
                    ? smartDefaults.recommendedSize
                    : null
                }
                showDetails
              />
              <div className="mt-2 px-1">
                <QualityBar quality={smartDefaults.quality} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ZoomInIcon className="w-4 h-4" />
          <span>
            {showAdvanced ? "Ocultar opciones avanzadas" : "Ajustar manualmente"}
          </span>
        </button>

        {/* Advanced Options Panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 py-3">
                <Button
                  variant={mode === "fill" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("fill")}
                  className="flex-1"
                >
                  Llenar
                </Button>
                <Button
                  variant={mode === "fit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("fit")}
                  className="flex-1"
                >
                  Ver completa
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center pb-2">
                {mode === "fill"
                  ? "La foto llena todo el espacio. Puede cortarse en los bordes."
                  : "Se ve toda la foto. Puede tener bordes blancos."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Continue Button */}
      <section className="px-4 pb-8">
        <Button
          onClick={handleContinue}
          disabled={smartDefaults.isProcessing}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30"
        >
          Continuar
          <ArrowRightIcon className="w-5 h-5 ml-2" />
        </Button>
      </section>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<PreviewPageSkeleton />}>
      <PreviewPageContent />
    </Suspense>
  );
}
