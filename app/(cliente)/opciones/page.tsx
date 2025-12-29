"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import {
  calculatePrice,
  PAPER_MULTIPLIERS,
  PAPER_NAMES,
  PAPER_SURCHARGES,
  PHOTO_PRINT_COST,
  formatPrice,
} from "@/lib/utils/price-calculator";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
  SparklesIcon,
  ImageIcon,
  StickyNoteIcon,
  CircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useCanvasGestures";
import type { PaperType, ProductType } from "@/lib/supabase/types";

const sizeOptions: { value: PrintSizeName; label: string; dimensions: string }[] = [
  { value: "4x6", label: '4x6"', dimensions: "10x15 cm" },
  { value: "5x7", label: '5x7"', dimensions: "13x18 cm" },
  { value: "8x10", label: '8x10"', dimensions: "20x25 cm" },
  { value: "Carta", label: "Carta", dimensions: "22x28 cm" },
];

const paperOptions: {
  value: PaperType;
  label: string;
  icon: typeof ImageIcon;
  popular?: boolean;
}[] = [
  { value: "bond_normal", label: "Bond Normal", icon: ImageIcon },
  { value: "fotografico", label: "Fotografico", icon: SparklesIcon, popular: true },
  { value: "opalina", label: "Opalina", icon: CircleIcon },
  { value: "cartulina_lino", label: "Cartulina Lino", icon: StickyNoteIcon },
  { value: "sticker_semigloss", label: "Sticker", icon: SparklesIcon },
];

function OpcionesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setPrintOptions } = useOrder();

  const productType = (searchParams.get("type") as ProductType) || state.productType || "photo";

  const [selectedSize, setSelectedSize] = useState<PrintSizeName>(
    state.printOptions.sizeName || "4x6"
  );
  // Para fotos siempre es papel fotográfico
  const [selectedPaper, setSelectedPaper] = useState<PaperType>("fotografico");
  const [quantity, setQuantity] = useState(state.printOptions.quantity || 1);

  // Calcular precio
  const priceBreakdown = calculatePrice({
    sizeName: selectedSize,
    paperType: selectedPaper,
    quantity,
    productType,
  });

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(100, quantity + delta));
    setQuantity(newQuantity);
    setPrintOptions({ quantity: newQuantity });
    hapticFeedback("light");
  };

  const handleSizeSelect = (size: PrintSizeName) => {
    setSelectedSize(size);
    setPrintOptions({ sizeName: size });
    hapticFeedback("light");
  };

  const handlePaperSelect = (paper: PaperType) => {
    setSelectedPaper(paper);
    setPrintOptions({ paperType: paper });
    hapticFeedback("light");
  };

  const handleContinue = () => {
    setPrintOptions({
      sizeName: selectedSize,
      paperType: selectedPaper,
      quantity,
    });
    hapticFeedback("medium");
    router.push(`/resumen?type=${productType}`);
  };

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
        <h1 className="text-lg font-semibold text-gray-900">Opciones</h1>
        <div className="w-16" />
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-4 overflow-auto">
        <div className="max-w-md mx-auto space-y-6">
          {/* Tamano - Chips horizontales */}
          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Tamano</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {sizeOptions.map((option, index) => {
                const isSelected = selectedSize === option.value;
                // Todas las fotos cuestan lo mismo: ₡500
                const basePrice = PHOTO_PRINT_COST;

                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSizeSelect(option.value)}
                    className={cn(
                      "relative flex-shrink-0 flex flex-col items-center px-5 py-4 rounded-2xl border-2 transition-all min-w-[90px]",
                      isSelected
                        ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center shadow-md"
                      >
                        <CheckIcon className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    <span className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-sky-700" : "text-gray-800"
                    )}>
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {option.dimensions}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold mt-2",
                      isSelected ? "text-sky-600" : "text-gray-600"
                    )}>
                      {formatPrice(basePrice)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Tipo de papel - Para fotos siempre es fotográfico */}
          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Papel</h2>
            <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="font-semibold text-sky-700">Papel Fotográfico</p>
                <p className="text-sm text-sky-600">Acabado brillante profesional</p>
              </div>
              <CheckIcon className="w-5 h-5 text-sky-500 ml-auto" />
            </div>
          </section>

          {/* Cantidad - Stepper grande */}
          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Cantidad</h2>
            <div className="flex items-center justify-center gap-6 py-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  quantity <= 1
                    ? "bg-gray-100 text-gray-300"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400"
                )}
              >
                <MinusIcon className="w-6 h-6" />
              </motion.button>

              <AnimatePresence mode="wait">
                <motion.span
                  key={quantity}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-5xl font-bold text-gray-900 min-w-[80px] text-center"
                >
                  {quantity}
                </motion.span>
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 100}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  quantity >= 100
                    ? "bg-gray-100 text-gray-300"
                    : "bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 shadow-lg shadow-sky-500/30"
                )}
              >
                <PlusIcon className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Quick quantity buttons */}
            <div className="flex justify-center gap-2">
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setQuantity(num);
                    setPrintOptions({ quantity: num });
                    hapticFeedback("light");
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                    quantity === num
                      ? "bg-sky-100 text-sky-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Fixed Bottom - Price Summary & Button */}
      <section className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto">
          {/* Price breakdown */}
          <motion.div
            layout
            className="flex items-center justify-between mb-4"
          >
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={priceBreakdown.total}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  {priceBreakdown.formattedTotal}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {quantity}x {selectedSize}
              </p>
              <p className="text-xs text-gray-500">
                {PAPER_NAMES[selectedPaper]} - {formatPrice(priceBreakdown.pricePerUnit)} c/u
              </p>
            </div>
          </motion.div>

          {/* Continue button */}
          <Button
            onClick={handleContinue}
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30"
          >
            Confirmar pedido
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function OpcionesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      }
    >
      <OpcionesPageContent />
    </Suspense>
  );
}
