"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhotoLayout } from "@/lib/supabase/types";
import { LETTER_WIDTH, LETTER_HEIGHT, calculateSheetsNeeded } from "@/lib/config/photo-layouts";
import type { FillMode } from "./LayoutSelector";
import type { PhotoWithQuantity, Photo } from "@/lib/types/photos";

interface LayoutPreviewProps {
  layout: PhotoLayout;
  photos: PhotoWithQuantity[];
  fillMode?: FillMode;
  className?: string;
  overrideQuantity?: number; // Para modo single-photo: anula photo.quantity
}

// Componente para una sola hoja
function SheetPreview({
  layout,
  photosForThisSheet,
  sheetNumber,
  totalSheets,
  fillMode,
}: {
  layout: PhotoLayout;
  photosForThisSheet: Photo[]; // Array de fotos para llenar los slots
  sheetNumber: number;
  totalSheets: number;
  fillMode: FillMode;
}) {
  const { positions } = layout.layout_data;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative bg-white border-2 border-gray-200 rounded-lg shadow-md"
        style={{
          aspectRatio: `${LETTER_WIDTH} / ${LETTER_HEIGHT}`,
          width: totalSheets === 1 ? "200px" : totalSheets <= 3 ? "140px" : "100px",
        }}
      >
        {positions.map((pos, index) => {
          const left = (pos.x / LETTER_WIDTH) * 100;
          const top = (pos.y / LETTER_HEIGHT) * 100;
          const width = (pos.width / LETTER_WIDTH) * 100;
          const height = (pos.height / LETTER_HEIGHT) * 100;
          // Obtener la foto correspondiente a este slot
          const photoForSlot = photosForThisSheet[index];
          const hasPhoto = !!photoForSlot;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (sheetNumber * positions.length + index) * 0.02 }}
              className={cn(
                "absolute overflow-hidden rounded-sm border",
                hasPhoto
                  ? "bg-gray-100 border-gray-300"
                  : "bg-gray-50 border-dashed border-gray-200"
              )}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              {hasPhoto ? (
                <img
                  src={photoForSlot.preview}
                  alt=""
                  className={cn(
                    "w-full h-full",
                    fillMode === "fill" ? "object-cover" : "object-contain bg-gray-50"
                  )}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <FileIcon className="w-1/3 h-1/3" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <span className="text-xs text-gray-400 mt-2">
        Hoja {sheetNumber + 1}
      </span>
    </div>
  );
}

export function LayoutPreview({
  layout,
  photos,
  fillMode = "fill",
  className,
  overrideQuantity,
}: LayoutPreviewProps) {
  const photosPerSheet = layout.photos_per_sheet;

  // Calcular cantidad total (suma de todas las cantidades)
  // En modo single-photo con override, usar overrideQuantity
  const totalQuantity = useMemo(() => {
    if (photos.length === 1 && overrideQuantity !== undefined) {
      return overrideQuantity;
    }
    return photos.reduce((sum, p) => sum + (p.quantity || 1), 0);
  }, [photos, overrideQuantity]);

  // Expandir fotos segun su cantidad (ej: foto1 x2, foto2 x3 = [f1,f1,f2,f2,f2])
  // En modo single-photo con override, usar overrideQuantity en lugar de photo.quantity
  const expandedPhotos = useMemo(() => {
    const result: Photo[] = [];
    photos.forEach((photo) => {
      // En modo single-photo con override, usar overrideQuantity
      const qty = (photos.length === 1 && overrideQuantity !== undefined)
        ? overrideQuantity
        : (photo.quantity || 1);
      for (let i = 0; i < qty; i++) {
        result.push({
          id: `${photo.id}-${i}`,
          preview: photo.preview,
          name: photo.name,
          storagePath: photo.storagePath,
          publicUrl: photo.publicUrl,
        });
      }
    });
    return result;
  }, [photos, overrideQuantity]);

  // Calcular cuantas hojas se necesitan
  const sheetsNeeded = useMemo(() => {
    return calculateSheetsNeeded(totalQuantity, photosPerSheet);
  }, [totalQuantity, photosPerSheet]);

  // Espacios vacios en la ultima hoja
  const emptySpots = useMemo(() => {
    const totalPrinted = sheetsNeeded * photosPerSheet;
    return totalPrinted - totalQuantity;
  }, [sheetsNeeded, photosPerSheet, totalQuantity]);

  // Distribuir fotos expandidas en hojas
  const sheetsData = useMemo(() => {
    const sheets: Photo[][] = [];
    let photoIndex = 0;

    for (let i = 0; i < sheetsNeeded; i++) {
      const photosInThisSheet: Photo[] = [];
      for (let j = 0; j < photosPerSheet && photoIndex < expandedPhotos.length; j++) {
        photosInThisSheet.push(expandedPhotos[photoIndex]);
        photoIndex++;
      }
      sheets.push(photosInThisSheet);
    }

    return sheets;
  }, [sheetsNeeded, photosPerSheet, expandedPhotos]);

  // Determinar texto segun cantidad de fotos distintas
  const infoText = useMemo(() => {
    if (photos.length === 1) {
      return `${totalQuantity} ${totalQuantity === 1 ? "copia" : "copias"} de tu foto`;
    }
    return `${totalQuantity} fotos en total (${photos.length} ${photos.length === 1 ? "imagen" : "imagenes"} distintas)`;
  }, [photos.length, totalQuantity]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Preview de todas las hojas */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className={cn(
          "flex justify-center gap-3 flex-wrap",
          sheetsNeeded > 4 && "gap-2"
        )}>
          {sheetsData.map((photosForSheet, sheetIndex) => (
            <SheetPreview
              key={sheetIndex}
              layout={layout}
              photosForThisSheet={photosForSheet}
              sheetNumber={sheetIndex}
              totalSheets={sheetsNeeded}
              fillMode={fillMode}
            />
          ))}
        </div>

        {/* Indicador de papel */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Papel carta (8.5&quot; x 11&quot;)
        </div>
      </div>

      {/* Info de hojas */}
      <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
        <div className="text-center">
          <div className="text-4xl font-bold text-black mb-1">
            {sheetsNeeded} {sheetsNeeded === 1 ? "hoja" : "hojas"}
          </div>
          <div className="text-sm text-primary font-medium">
            {infoText}
          </div>
          {emptySpots > 0 && (
            <div className="text-xs text-destructive mt-2">
              {emptySpots} {emptySpots === 1 ? "espacio quedara vacio" : "espacios quedaran vacios"} en la ultima hoja
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {fillMode === "fill" ? "Llenar (puede recortar)" : "Ajustar (sin recortar)"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Version compacta del preview para listas
export function LayoutPreviewCompact({
  layout,
  photos,
  className,
  overrideQuantity,
}: {
  layout: PhotoLayout;
  photos: PhotoWithQuantity[];
  className?: string;
  overrideQuantity?: number; // Para modo single-photo: anula photo.quantity
}) {
  const { positions } = layout.layout_data;

  // Expandir fotos segun su cantidad (igual que LayoutPreview)
  // En modo single-photo con override, usar overrideQuantity
  const expandedPhotos = useMemo(() => {
    const result: Photo[] = [];
    photos.forEach((photo) => {
      // En modo single-photo con override, usar overrideQuantity
      const qty = (photos.length === 1 && overrideQuantity !== undefined)
        ? overrideQuantity
        : (photo.quantity || 1);
      for (let i = 0; i < qty; i++) {
        result.push({
          id: `${photo.id}-${i}`,
          preview: photo.preview,
          name: photo.name,
          storagePath: photo.storagePath,
          publicUrl: photo.publicUrl,
        });
      }
    });
    return result;
  }, [photos, overrideQuantity]);

  return (
    <div
      className={cn(
        "relative bg-white border border-gray-200 rounded",
        className
      )}
      style={{
        aspectRatio: `${LETTER_WIDTH} / ${LETTER_HEIGHT}`,
      }}
    >
      {positions.map((pos, index) => {
        const left = (pos.x / LETTER_WIDTH) * 100;
        const top = (pos.y / LETTER_HEIGHT) * 100;
        const width = (pos.width / LETTER_WIDTH) * 100;
        const height = (pos.height / LETTER_HEIGHT) * 100;
        // Obtener la foto correspondiente a este slot
        const photoForSlot = expandedPhotos[index];

        return (
          <div
            key={index}
            className={cn(
              "absolute overflow-hidden rounded-sm border",
              photoForSlot
                ? "bg-primary/10 border-primary/20"
                : "bg-gray-50 border-dashed border-gray-200"
            )}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            {photoForSlot && (
              <img
                src={photoForSlot.preview}
                alt=""
                className="w-full h-full object-cover opacity-70"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
