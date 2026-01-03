"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, ExpandIcon, ShrinkIcon, MinusIcon, PlusIcon, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PHOTO_SIZES,
  PHOTO_LAYOUTS,
  type PhotoSizeType,
  calculateSheetsNeeded,
} from "@/lib/config/photo-layouts";
import type { PhotoLayout } from "@/lib/supabase/types";
import type { PhotoWithQuantity } from "@/lib/types/photos";

// Re-exportar para compatibilidad
export type { PhotoWithQuantity } from "@/lib/types/photos";
export type FillMode = "fill" | "fit";

interface LayoutSelectorProps {
  photos: PhotoWithQuantity[];
  onSelect: (layout: PhotoLayout, totalQuantity: number, fillMode: FillMode) => void;
  onPhotosChange?: (photos: PhotoWithQuantity[]) => void;
  selectedLayoutId?: string;
  initialQuantity?: number;
}

// Cantidades rapidas predefinidas
const QUICK_QUANTITIES = [1, 4, 8, 12, 16, 24];

// Componente para stepper individual de una foto
function PhotoQuantityItem({
  photo,
  onQuantityChange,
}: {
  photo: PhotoWithQuantity;
  onQuantityChange: (id: string, delta: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {photo.preview ? (
          <img
            src={photo.preview}
            alt={photo.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Nombre */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {photo.name || `Foto ${photo.id.slice(-4)}`}
        </p>
        <p className="text-xs text-gray-500">
          {photo.quantity} {photo.quantity === 1 ? "copia" : "copias"}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onQuantityChange(photo.id, -1)}
          disabled={photo.quantity <= 1}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all",
            photo.quantity <= 1
              ? "bg-gray-100 text-gray-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
          )}
        >
          <MinusIcon className="w-4 h-4" />
        </motion.button>

        <motion.span
          key={photo.quantity}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-8 text-center text-xl font-bold text-gray-900 tabular-nums"
        >
          {photo.quantity}
        </motion.span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onQuantityChange(photo.id, 1)}
          disabled={photo.quantity >= 50}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all",
            photo.quantity >= 50
              ? "bg-gray-100 text-gray-300"
              : "bg-primary text-black hover:bg-primary/90 active:bg-primary/80 shadow-md shadow-primary/30"
          )}
        >
          <PlusIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

export function LayoutSelector({
  photos,
  onSelect,
  onPhotosChange,
  selectedLayoutId,
  initialQuantity = 1,
}: LayoutSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<PhotoSizeType>("4x6");
  const [fillMode, setFillMode] = useState<FillMode>("fill");

  // Para el modo de 1 sola foto, usamos quantity local
  const [singlePhotoQuantity, setSinglePhotoQuantity] = useState<number>(initialQuantity);

  // Determinar si estamos en modo multi-foto
  const isMultiPhoto = photos.length > 1;

  // Calcular cantidad total (suma de todas las fotos)
  const totalQuantity = useMemo(() => {
    if (isMultiPhoto) {
      return photos.reduce((sum, p) => sum + p.quantity, 0);
    }
    return singlePhotoQuantity;
  }, [photos, isMultiPhoto, singlePhotoQuantity]);

  // Obtener el mejor layout para el tamano (el que tiene mas fotos por hoja)
  const bestLayoutForSize = useMemo(() => {
    const layouts = PHOTO_LAYOUTS.filter(
      (l) => l.photo_size === selectedSize && l.is_active
    );
    if (layouts.length === 0) return null;
    // Ordenar por fotos por hoja descendente y tomar el primero
    return layouts.sort((a, b) => b.photos_per_sheet - a.photos_per_sheet)[0];
  }, [selectedSize]);

  // Calcular hojas necesarias basado en el total
  const sheetsInfo = useMemo(() => {
    if (!bestLayoutForSize) return null;
    const photosPerSheet = bestLayoutForSize.photos_per_sheet;
    const sheetsNeeded = calculateSheetsNeeded(totalQuantity, photosPerSheet);
    const totalPrinted = sheetsNeeded * photosPerSheet;
    const emptySpots = totalPrinted - totalQuantity;
    return {
      sheetsNeeded,
      photosPerSheet,
      totalPrinted,
      emptySpots,
    };
  }, [bestLayoutForSize, totalQuantity]);

  // Notificar al padre cuando cambia la seleccion
  const notifyParent = useCallback(() => {
    if (bestLayoutForSize) {
      onSelect(bestLayoutForSize, totalQuantity, fillMode);
    }
  }, [bestLayoutForSize, totalQuantity, fillMode, onSelect]);

  useEffect(() => {
    notifyParent();
  }, [notifyParent]);

  const handleSizeSelect = (size: PhotoSizeType) => {
    setSelectedSize(size);
  };

  // Handler para modo single-photo (stepper global)
  const handleSingleQuantityChange = (delta: number) => {
    setSinglePhotoQuantity((prev) => Math.max(1, Math.min(100, prev + delta)));
  };

  const handleSingleQuantitySet = (value: number) => {
    setSinglePhotoQuantity(Math.max(1, Math.min(100, value)));
  };

  // Handler para modo multi-photo (stepper individual)
  const handlePhotoQuantityChange = (photoId: string, delta: number) => {
    const updatedPhotos = photos.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          quantity: Math.max(1, Math.min(50, p.quantity + delta)),
        };
      }
      return p;
    });
    onPhotosChange?.(updatedPhotos);
  };

  return (
    <div className="space-y-6">
      {/* 1. Toggle Llenar/Ajustar - PRIMERO */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Como ajustar la foto?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFillMode("fill")}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              fillMode === "fill"
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            {fillMode === "fill" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
              >
                <CheckIcon className="w-4 h-4 text-black" />
              </motion.div>
            )}
            <ExpandIcon className={cn(
              "w-6 h-6",
              fillMode === "fill" ? "text-primary" : "text-gray-400"
            )} />
            <div className="text-left">
              <div className={cn(
                "font-semibold",
                fillMode === "fill" ? "text-black" : "text-gray-700"
              )}>
                Llenar
              </div>
              <div className="text-xs text-gray-500">
                Recorta para llenar
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFillMode("fit")}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
              fillMode === "fit"
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            {fillMode === "fit" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
              >
                <CheckIcon className="w-4 h-4 text-black" />
              </motion.div>
            )}
            <ShrinkIcon className={cn(
              "w-6 h-6",
              fillMode === "fit" ? "text-primary" : "text-gray-400"
            )} />
            <div className="text-left">
              <div className={cn(
                "font-semibold",
                fillMode === "fit" ? "text-black" : "text-gray-700"
              )}>
                Ajustar
              </div>
              <div className="text-xs text-gray-500">
                Sin recortar nada
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* 2. Selector de tamano de foto */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Tamano de foto
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {(Object.keys(PHOTO_SIZES) as PhotoSizeType[]).map((size, index) => {
            const info = PHOTO_SIZES[size];
            const isSelected = selectedSize === size;
            return (
              <motion.button
                key={size}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSizeSelect(size)}
                className={cn(
                  "relative flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-center min-w-[80px]",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md"
                  >
                    <CheckIcon className="w-3 h-3 text-black" />
                  </motion.div>
                )}
                <div
                  className={cn(
                    "text-base font-bold",
                    isSelected ? "text-black" : "text-gray-700"
                  )}
                >
                  {info.displayName.split(" ")[0]}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {info.width}"x{info.height}"
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. Selector de cantidad */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {isMultiPhoto ? "Copias por foto" : "Cuantas copias quieres?"}
        </h3>

        {isMultiPhoto ? (
          /* MODO MULTI-FOTO: Lista con stepper individual */
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {photos.map((photo) => (
                <PhotoQuantityItem
                  key={photo.id}
                  photo={photo}
                  onQuantityChange={handlePhotoQuantityChange}
                />
              ))}
            </AnimatePresence>

            {/* Total de fotos */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center pt-3 border-t border-gray-200"
            >
              <span className="text-sm text-gray-600">Total de fotos:</span>
              <motion.span
                key={totalQuantity}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-xl font-bold text-primary"
              >
                {totalQuantity}
              </motion.span>
            </motion.div>
          </div>
        ) : (
          /* MODO SINGLE-FOTO: Stepper global estilo Apple */
          <>
            {/* Stepper principal */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSingleQuantityChange(-1)}
                disabled={singlePhotoQuantity <= 1}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  singlePhotoQuantity <= 1
                    ? "bg-gray-100 text-gray-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                )}
              >
                <MinusIcon className="w-6 h-6" />
              </motion.button>

              <div className="w-24 text-center">
                <motion.span
                  key={singlePhotoQuantity}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-bold text-gray-900 tabular-nums"
                >
                  {singlePhotoQuantity}
                </motion.span>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSingleQuantityChange(1)}
                disabled={singlePhotoQuantity >= 100}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  singlePhotoQuantity >= 100
                    ? "bg-gray-100 text-gray-300"
                    : "bg-primary text-black hover:bg-primary/90 active:bg-primary/80 shadow-lg shadow-primary/30"
                )}
              >
                <PlusIcon className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Botones de incremento rapido */}
            <div className="flex justify-center gap-2 mb-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSingleQuantityChange(-10)}
                disabled={singlePhotoQuantity <= 1}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  singlePhotoQuantity <= 1
                    ? "bg-gray-50 text-gray-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                -10
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSingleQuantityChange(10)}
                disabled={singlePhotoQuantity >= 100}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  singlePhotoQuantity >= 100
                    ? "bg-gray-50 text-gray-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                +10
              </motion.button>
            </div>

            {/* Cantidades rapidas */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_QUANTITIES.map((q) => (
                <motion.button
                  key={q}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSingleQuantitySet(q)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    singlePhotoQuantity === q
                      ? "bg-primary text-black shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. Resumen de hojas (sin precios) */}
      {sheetsInfo && bestLayoutForSize && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 rounded-2xl p-5 border border-primary/20"
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-black mb-1">
              {sheetsInfo.sheetsNeeded} {sheetsInfo.sheetsNeeded === 1 ? "hoja" : "hojas"}
            </div>
            <div className="text-sm text-primary font-medium">
              {totalQuantity} {totalQuantity === 1 ? "copia" : "copias"} de tu foto
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {sheetsInfo.photosPerSheet} fotos por hoja
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
