"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  PaletteIcon,
  CircleIcon,
  PrinterIcon,
  LoaderIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { base64ToArrayBuffer } from "@/lib/utils/pdf-processor";
import type { PaperType } from "@/lib/supabase/types";
import {
  PRINT_COSTS,
  PAPER_SURCHARGES,
  PAPER_NAMES,
  calculateDocumentPrice,
  formatPrice,
} from "@/lib/utils/price-calculator";

interface StoredDocument {
  name: string;
  type: string;
  size: number;
  pageCount: number | null;
}

export default function DocumentoOpcionesPage() {
  const router = useRouter();
  const [document, setDocument] = useState<StoredDocument | null>(null);
  const [isColor, setIsColor] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<PaperType>("bond_normal");
  const [isUploading, setIsUploading] = useState(false);

  // Load document from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("uploadedDocument");
    if (stored) {
      try {
        setDocument(JSON.parse(stored));
      } catch {
        // Redirect if no document
        router.push("/documento");
      }
    } else {
      router.push("/documento");
    }
  }, [router]);

  const handleContinue = async () => {
    if (!document) return;
    setIsUploading(true);

    try {
      // 1. Leer PDF procesado de sessionStorage
      const pdfBase64 = sessionStorage.getItem("documentPdfData");
      if (!pdfBase64) {
        throw new Error("No se encontró el documento. Por favor vuelve a subirlo.");
      }

      // 2. Convertir a blob
      const pdfBuffer = base64ToArrayBuffer(pdfBase64);
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });

      // 3. Generar path único
      let sessionId = sessionStorage.getItem("uploadSessionId");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("uploadSessionId", sessionId);
      }
      const storagePath = `${sessionId}/${crypto.randomUUID()}.pdf`;

      // 4. Subir a Supabase Storage
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("originals")
        .upload(storagePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error);
        throw new Error("Error al subir el documento");
      }

      // 5. Guardar path y opciones en sessionStorage
      sessionStorage.setItem("documentStoragePath", storagePath);
      sessionStorage.setItem("documentIsColor", isColor.toString());
      sessionStorage.setItem("selectedPaper", selectedPaper);
      sessionStorage.setItem("sheetsCount", (document.pageCount || 1).toString());

      // 6. Navegar al resumen
      router.push("/resumen?type=document");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Error al subir documento. Intenta de nuevo.");
      setIsUploading(false);
    }
  };

  if (!document) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/documento")}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-gray-900"
            >
              Opciones de impresion
            </motion.h1>
            <p className="text-sm text-gray-500">
              Paso 2 de 2: Configura tu impresion
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <PrinterIcon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 h-1 rounded-full bg-emerald-500" />
          <div className="flex-1 h-1 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Document summary */}
        <section className="px-4 pb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileTextIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {document.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {document.pageCount}{" "}
                  {document.pageCount === 1 ? "pagina" : "paginas"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Color option */}
        <section className="px-4 pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Tipo de impresión
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Color option */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsColor(true)}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all text-center",
                isColor
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
                  isColor ? "bg-emerald-100" : "bg-gray-100"
                )}
              >
                <PaletteIcon
                  className={cn(
                    "w-6 h-6",
                    isColor ? "text-emerald-600" : "text-gray-400"
                  )}
                />
              </div>
              <span
                className={cn(
                  "font-semibold block",
                  isColor ? "text-emerald-700" : "text-gray-700"
                )}
              >
                A color
              </span>
              <span className={cn(
                "text-sm",
                isColor ? "text-emerald-600" : "text-gray-500"
              )}>
                {formatPrice(PRINT_COSTS.color)}/pág
              </span>
              {isColor && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>

            {/* B&W option */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsColor(false)}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all text-center",
                !isColor
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
                  !isColor ? "bg-emerald-100" : "bg-gray-100"
                )}
              >
                <CircleIcon
                  className={cn(
                    "w-6 h-6",
                    !isColor ? "text-emerald-600" : "text-gray-400"
                  )}
                />
              </div>
              <span
                className={cn(
                  "font-semibold block",
                  !isColor ? "text-emerald-700" : "text-gray-700"
                )}
              >
                Blanco y negro
              </span>
              <span className={cn(
                "text-sm",
                !isColor ? "text-emerald-600" : "text-gray-500"
              )}>
                {formatPrice(PRINT_COSTS.blackWhite)}/pág
              </span>
              {!isColor && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          </div>
        </section>

        {/* Paper selector */}
        <section className="px-4 pb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Tipo de papel
          </h3>
          <div className="space-y-2">
            {(["bond_normal", "opalina", "cartulina_lino", "sticker_semigloss"] as PaperType[]).map((paper) => {
              const isSelected = selectedPaper === paper;
              const surcharge = PAPER_SURCHARGES[paper];

              return (
                <motion.button
                  key={paper}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPaper(paper)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {!isSelected && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={cn(
                      "font-medium",
                      isSelected ? "text-emerald-700" : "text-gray-700"
                    )}>
                      {PAPER_NAMES[paper]}
                    </span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-emerald-600" : "text-gray-500"
                  )}>
                    {surcharge > 0 ? `+${formatPrice(surcharge)}` : "Incluido"}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Price summary */}
        <section className="px-4 pb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Resumen</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {document.pageCount} {document.pageCount === 1 ? "página" : "páginas"} × {formatPrice(isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite)}
                </span>
                <span className="text-gray-800">
                  {formatPrice((isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite) * (document.pageCount || 1))}
                </span>
              </div>
              {PAPER_SURCHARGES[selectedPaper] > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Papel {PAPER_NAMES[selectedPaper]} × {document.pageCount}
                  </span>
                  <span className="text-gray-800">
                    +{formatPrice(PAPER_SURCHARGES[selectedPaper] * (document.pageCount || 1))}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-gray-800">Total</span>
                <span className="text-emerald-600 text-lg">
                  {calculateDocumentPrice(document.pageCount || 1, isColor, selectedPaper).formattedTotal}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Continue Button */}
      <section className="px-4 pb-8 mt-auto bg-white border-t border-gray-100 pt-4">
        <Button
          onClick={handleContinue}
          disabled={isUploading}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-2xl transition-all",
            "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30",
            isUploading && "opacity-80 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <>
              <LoaderIcon className="w-5 h-5 mr-2 animate-spin" />
              Subiendo documento...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Ver resumen
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
