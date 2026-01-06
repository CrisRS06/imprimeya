"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { generateOrderCode, formatOrderCode } from "@/lib/utils/code-generator";
import {
  CheckCircleIcon,
  CopyIcon,
  HomeIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  PackageIcon,
  CameraIcon,
  FileTextIcon,
  MaximizeIcon,
  UserIcon,
  ClipboardCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useCanvasGestures";
import { SuccessAnimation } from "@/components/feedback/SuccessAnimation";
import { Spinner } from "@/components/feedback/LoadingStates";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutPreviewCompact } from "@/components/fotos/LayoutPreview";
import { PaperBadge } from "@/components/fotos/PaperSelector";
import type { ProductType, PaperType, PhotoLayout } from "@/lib/supabase/types";
import { getLayoutById } from "@/lib/config/photo-layouts";
import { PAPERS } from "@/lib/config/papers";
import { calculatePrice, formatPrice } from "@/lib/utils/price-calculator";

const productTypeLabels: Record<ProductType, string> = {
  photo: "Imágenes",
  document: "Documento",
  poster: "Poster",
};

const productIcons: Record<ProductType, typeof CameraIcon> = {
  photo: CameraIcon,
  document: FileTextIcon,
  poster: MaximizeIcon,
};

import type { PhotoWithQuantity } from "@/lib/types/photos";

function ResumenPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, resetOrder } = useOrder();

  const productType =
    (searchParams.get("type") as ProductType) || state.productType || "photo";

  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Data from sessionStorage for photo flow
  const [photos, setPhotos] = useState<PhotoWithQuantity[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<PhotoLayout | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PaperType | null>(null);
  const [sheetsCount, setSheetsCount] = useState(1);
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [isColor, setIsColor] = useState<boolean>(true); // Para documentos
  const [fillMode, setFillMode] = useState<"fill" | "fit">("fill"); // fill=cover, fit=contain

  // Calcular precio
  const priceBreakdown = useMemo(() => {
    if (!selectedPaper) return null;

    return calculatePrice({
      sizeName: selectedLayout?.photo_size || "4x6",
      paperType: selectedPaper,
      quantity: sheetsCount,
      productType: productType,
      isColor: productType === "photo" ? true : isColor,
    });
  }, [selectedPaper, sheetsCount, productType, isColor, selectedLayout]);

  // Load data from sessionStorage
  useEffect(() => {
    // Para documentos: cargar storagePath del PDF
    if (productType === "document") {
      const documentPath = sessionStorage.getItem("documentStoragePath");
      if (documentPath) {
        // Crear pseudo-photo con el storagePath del documento
        const docInfo = sessionStorage.getItem("uploadedDocument");
        const docName = docInfo ? JSON.parse(docInfo).name : "documento.pdf";
        setPhotos([{
          id: "document-pdf",
          name: docName,
          storagePath: documentPath,
          quantity: 1,
        } as PhotoWithQuantity]);
      }
    } else {
      // Photos con cantidades (para fotos)
      const storedPhotos = sessionStorage.getItem("uploadedPhotos");
      if (storedPhotos) {
        try {
          const parsed = JSON.parse(storedPhotos) as PhotoWithQuantity[];
          setPhotos(parsed.map((p) => ({ ...p, quantity: p.quantity || 1 })));
          // Calcular total desde las fotos
          const total = parsed.reduce((sum, p) => sum + (p.quantity || 1), 0);
          setTotalQuantity(total);
        } catch {
          // fallback
        }
      }
    }

    // Layout
    const layoutId = sessionStorage.getItem("selectedLayoutId");
    if (layoutId) {
      const layout = getLayoutById(layoutId);
      if (layout) {
        setSelectedLayout(layout);
      }
    }

    // Paper
    const paper = sessionStorage.getItem("selectedPaper") as PaperType;
    if (paper) {
      setSelectedPaper(paper);
    }

    // Sheets count
    const sheets = sessionStorage.getItem("sheetsCount");
    if (sheets) {
      setSheetsCount(parseInt(sheets, 10));
    }

    // Color (para documentos)
    const colorSetting = sessionStorage.getItem("documentIsColor");
    if (colorSetting !== null) {
      setIsColor(colorSetting === "true");
    }

    // Fill mode (fill=cover, fit=contain)
    const storedFillMode = sessionStorage.getItem("fillMode") as "fill" | "fit" | null;
    if (storedFillMode) {
      setFillMode(storedFillMode);
    }
  }, [productType]);

  // Generate preview code on mount
  useEffect(() => {
    if (!orderCode && !isSubmitted) {
      setOrderCode(generateOrderCode());
    }
  }, [orderCode, isSubmitted]);

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!orderCode) return;

    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      hapticFeedback("success");
      toast.success("Codigo copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    hapticFeedback("medium");

    try {
      // Get storage paths (not just names) for the images
      // storagePath es el path completo en Supabase Storage
      // Validacion estricta: TODAS las fotos deben tener storagePath
      const photosWithoutStorage = photos.filter((p) => !p.storagePath);
      if (photosWithoutStorage.length > 0) {
        const names = photosWithoutStorage.map((p) => p.name).join(", ");
        throw new Error(
          `Las siguientes fotos no se subieron correctamente: ${names}. Por favor vuelve a subirlas.`
        );
      }

      const uploadedImages = photos.map((p) => p.storagePath!);

      // Determinar sizeName segun tipo de producto
      // Para fotos: usar el tamaño del layout seleccionado
      // Para documentos: usar "Carta" (tamaño estándar)
      const sizeName = productType === "document"
        ? "Carta"
        : selectedLayout?.photo_size || "4x6";

      // Call API
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          sizeName,
          paperType: selectedPaper || "bond_normal",  // Default para documentos
          quantity: sheetsCount,  // API usa quantity para hojas a imprimir
          originalImages: uploadedImages,  // Ahora son paths de Supabase Storage
          isColor,  // Para documentos: true = color (₡100), false = B&N (₡50)
          designData: {
            ...state.fabricData,
            layoutId: selectedLayout?.id,
            sizeName,
            totalPhotos: totalQuantity,
            photosWithQuantities: photos,
            fillMode, // fill=cover, fit=contain
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar detalles de validación si existen
        const errorMsg = data.details
          ? `${data.error}: ${data.details.join(", ")}`
          : data.error || "Error creando pedido";
        console.error("Order validation failed:", data);
        throw new Error(errorMsg);
      }

      // Show success animation
      setShowSuccess(true);
      setOrderCode(data.order.code);

      // After animation, show result
      setTimeout(() => {
        setShowSuccess(false);
        setIsSubmitted(true);
        hapticFeedback("success");
      }, 1500);
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Error al enviar pedido. Intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  // Go home
  const handleGoHome = () => {
    resetOrder();
    // Limpiar datos de fotos
    sessionStorage.removeItem("uploadedFiles");
    sessionStorage.removeItem("uploadedPhotos");
    sessionStorage.removeItem("selectedLayoutId");
    sessionStorage.removeItem("selectedPaper");
    sessionStorage.removeItem("sheetsCount");
    sessionStorage.removeItem("repeatMode");
    sessionStorage.removeItem("uploadSessionId");
    sessionStorage.removeItem("fillMode");
    // Limpiar datos de documentos
    sessionStorage.removeItem("documentPdfData");
    sessionStorage.removeItem("documentStoragePath");
    sessionStorage.removeItem("uploadedDocument");
    sessionStorage.removeItem("documentIsColor");
    router.push("/");
  };

  const IconComponent = productIcons[productType] || CameraIcon;

  // Success screen (after confirmation)
  if (isSubmitted && orderCode) {
    return (
      <div className="min-h-full flex flex-col bg-white">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full text-center space-y-6"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center"
            >
              <CheckCircleIcon className="w-14 h-14 text-primary" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-3xl font-bold text-gray-900">
                Pedido recibido
              </h1>
              <p className="text-gray-600 mt-2">
                Tu pedido esta siendo procesado
              </p>
            </motion.div>

            {/* Large code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900 rounded-3xl p-8 text-white"
            >
              <p className="text-sm text-gray-400 mb-3">Tu codigo de pedido</p>
              <p className="text-5xl font-mono font-bold tracking-widest">
                {formatOrderCode(orderCode)}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyCode}
                className="mt-5 flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-gray-800 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <CopyIcon className="w-4 h-4" />
                {copied ? "Copiado!" : "Copiar codigo"}
              </motion.button>
            </motion.div>

            {/* Next steps - Visual timeline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl border p-5 text-left"
            >
              <h3 className="font-semibold text-gray-900 mb-4">
                Proximos pasos
              </h3>
              <div className="space-y-4">
                {[
                  { icon: UserIcon, text: "Lleva este codigo a la cajera" },
                  { icon: ClipboardCheckIcon, text: "Confirma tu pedido" },
                  { icon: CreditCardIcon, text: "Paga en el mostrador" },
                  { icon: PackageIcon, text: "Recibe tu pedido" },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <span className="text-gray-700">{step.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Home button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full h-14 rounded-2xl text-base"
              >
                <HomeIcon className="w-5 h-5 mr-2" />
                Volver al inicio
              </Button>
            </motion.div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Success animation */}
      <SuccessAnimation
        show={showSuccess}
        title="Enviando..."
        showConfetti={false}
      />

      <div className="min-h-full flex flex-col bg-white">
        {/* Header */}
        <header className="px-6 pt-6 pb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex items-center gap-1 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-sm">Atras</span>
          </button>
          <h1 className="text-lg font-bold text-black">Resumen</h1>
          <div className="w-16" />
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 pb-4">
          <div className="max-w-md mx-auto space-y-4">
            {/* Order details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-black">
                    {productTypeLabels[productType]}
                  </h3>
                  <p className="text-sm text-gray-500">Tu pedido</p>
                </div>
              </div>

              {/* Photo-specific details */}
              {productType === "photo" && selectedLayout && (
                <div className="space-y-4">
                  {/* Layout preview */}
                  <div className="flex gap-4 items-start">
                    <div className="w-16 flex-shrink-0">
                      <LayoutPreviewCompact
                        layout={selectedLayout}
                        photos={photos}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {selectedLayout.display_name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {totalQuantity} {totalQuantity === 1 ? "imagen" : "imágenes"} en total
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Paper */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Papel</span>
                    {selectedPaper && <PaperBadge paperType={selectedPaper} />}
                  </div>

                  {/* Sheets */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Hojas a imprimir</span>
                    <span className="font-semibold text-gray-900 text-lg">
                      {sheetsCount}
                    </span>
                  </div>

                  {/* Desglose de precio */}
                  {priceBreakdown && (
                    <>
                      <hr />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Impresión ({sheetsCount} {sheetsCount === 1 ? "hoja" : "hojas"} × {formatPrice(priceBreakdown.basePrice)})
                          </span>
                          <span className="text-gray-900">{formatPrice(priceBreakdown.basePrice * sheetsCount)}</span>
                        </div>

                        {priceBreakdown.paperSurcharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Recargo papel ({formatPrice(priceBreakdown.paperSurcharge)}/hoja)
                            </span>
                            <span className="text-gray-900">{formatPrice(priceBreakdown.paperSurcharge * sheetsCount)}</span>
                          </div>
                        )}
                      </div>

                      <hr />

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          {priceBreakdown.formattedTotal}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Document-specific details */}
              {productType === "document" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Páginas</span>
                    <span className="font-medium text-gray-900">{sheetsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Tipo</span>
                    <span className="font-medium text-gray-900">
                      {isColor ? "Color" : "Blanco y Negro"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Papel</span>
                    {selectedPaper && <PaperBadge paperType={selectedPaper} />}
                  </div>

                  {/* Desglose de precio */}
                  {priceBreakdown && (
                    <>
                      <hr />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Impresión {isColor ? "color" : "B/N"} ({sheetsCount} {sheetsCount === 1 ? "pág" : "págs"} × {formatPrice(priceBreakdown.basePrice)})
                          </span>
                          <span className="text-gray-900">{formatPrice(priceBreakdown.basePrice * sheetsCount)}</span>
                        </div>

                        {priceBreakdown.paperSurcharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Recargo papel ({formatPrice(priceBreakdown.paperSurcharge)}/pág)
                            </span>
                            <span className="text-gray-900">{formatPrice(priceBreakdown.paperSurcharge * sheetsCount)}</span>
                          </div>
                        )}
                      </div>

                      <hr />

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          {priceBreakdown.formattedTotal}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Generic details for poster */}
              {productType === "poster" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Fotos</span>
                    <span className="font-medium text-gray-900">
                      {photos.length || state.images.length || "-"}
                    </span>
                  </div>
                  {state.printOptions.paperType && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Papel</span>
                      <span className="font-medium text-gray-900">
                        {PAPERS[state.printOptions.paperType as PaperType]?.displayName || state.printOptions.paperType}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Code preview */}
            <AnimatePresence>
              {orderCode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-100 rounded-2xl p-5 text-center"
                >
                  <p className="text-sm text-gray-600 mb-2">
                    Tu codigo sera
                  </p>
                  <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
                    {formatOrderCode(orderCode)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-500 text-center px-4"
            >
              Pagaras al recoger tu impresion en el mostrador
            </motion.p>
          </div>
        </main>

        {/* Fixed Bottom - Button */}
        <section className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
          <div className="max-w-md mx-auto">
            {/* Confirm button */}
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="w-full h-14 text-base font-semibold rounded-2xl disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2 border-black border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Confirmar pedido
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

function ResumenSkeleton() {
  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header skeleton */}
      <header className="px-6 pt-6 pb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-20" />
        <div className="w-16" />
      </header>

      {/* Content skeleton */}
      <main className="flex-1 px-4 pb-4">
        <div className="max-w-md mx-auto space-y-4">
          {/* Order card skeleton */}
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>

          {/* Code preview skeleton */}
          <div className="bg-gray-100 rounded-2xl p-5">
            <Skeleton className="h-4 w-24 mx-auto mb-3" />
            <Skeleton className="h-10 w-40 mx-auto" />
          </div>
        </div>
      </main>

      {/* Button skeleton */}
      <section className="sticky bottom-0 bg-white border-t px-4 py-4">
        <div className="max-w-md mx-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

export default function ResumenPage() {
  return (
    <Suspense fallback={<ResumenSkeleton />}>
      <ResumenPageContent />
    </Suspense>
  );
}
