"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LayoutGridIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { LayoutSelector, type FillMode } from "@/components/fotos/LayoutSelector";
import { LayoutPreview } from "@/components/fotos/LayoutPreview";
import type { PhotoLayout } from "@/lib/supabase/types";
import { getLayoutById } from "@/lib/config/photo-layouts";
import type { PhotoWithQuantity } from "@/lib/types/photos";

export default function FotosLayoutPage() {
  const router = useRouter();
  const { state } = useOrder();
  const [photos, setPhotos] = useState<PhotoWithQuantity[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<PhotoLayout | null>(null);
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [fillMode, setFillMode] = useState<FillMode>("fill");

  // Cargar fotos desde sessionStorage o contexto
  useEffect(() => {
    const stored = sessionStorage.getItem("uploadedPhotos");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PhotoWithQuantity[];
        // Asegurarse de que cada foto tenga quantity
        const withQuantity = parsed.map((p) => ({
          ...p,
          quantity: p.quantity || 1,
        }));
        setPhotos(withQuantity);
      } catch {
        // Si falla, usar imagenes del contexto
        if (state.images.length > 0) {
          setPhotos(
            state.images.map((img) => ({
              id: img.id,
              preview: img.preview,
              name: img.originalName,
              quantity: 1,
            }))
          );
        }
      }
    } else if (state.images.length > 0) {
      setPhotos(
        state.images.map((img) => ({
          id: img.id,
          preview: img.preview,
          name: img.originalName,
          quantity: 1,
        }))
      );
    }

    // Cargar layout guardado si existe
    const savedLayoutId = sessionStorage.getItem("selectedLayoutId");
    if (savedLayoutId) {
      const layout = getLayoutById(savedLayoutId);
      if (layout) {
        setSelectedLayout(layout);
      }
    }

    // Cargar fillMode guardado
    const savedFillMode = sessionStorage.getItem("fillMode");
    if (savedFillMode === "fill" || savedFillMode === "fit") {
      setFillMode(savedFillMode);
    }
  }, [state.images]);

  // Handler cuando cambia la seleccion del layout
  const handleLayoutSelect = useCallback((layout: PhotoLayout, qty: number, fill: FillMode) => {
    setSelectedLayout(layout);
    setTotalQuantity(qty);
    setFillMode(fill);
  }, []);

  // Handler cuando cambian las cantidades de las fotos
  const handlePhotosChange = useCallback((updatedPhotos: PhotoWithQuantity[]) => {
    setPhotos(updatedPhotos);
    // Actualizar sessionStorage con las nuevas cantidades
    sessionStorage.setItem("uploadedPhotos", JSON.stringify(updatedPhotos));
  }, []);

  const handleContinue = () => {
    if (!selectedLayout) return;

    // En modo single-photo, actualizar la foto con la cantidad correcta
    let photosToSave = photos;
    if (photos.length === 1) {
      photosToSave = [{
        ...photos[0],
        quantity: totalQuantity
      }];
    }

    // Guardar seleccion en sessionStorage
    sessionStorage.setItem("selectedLayoutId", selectedLayout.id);
    sessionStorage.setItem("photoQuantity", totalQuantity.toString());
    sessionStorage.setItem("fillMode", fillMode);
    // Guardar fotos con cantidad correcta (importante para modo single-photo)
    sessionStorage.setItem("uploadedPhotos", JSON.stringify(photosToSave));

    // Navegar a seleccion de papel
    router.push("/fotos/papel");
  };

  // Si no hay fotos, redirigir
  if (photos.length === 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <LayoutGridIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">
            No hay imágenes seleccionadas
          </h2>
          <p className="text-gray-500 mb-6">
            Primero debes subir las imágenes que quieres imprimir
          </p>
          <Button onClick={() => router.push("/fotos")}>
            Subir imágenes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/fotos")}
            className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black">Tamano y cantidad</h1>
            <p className="text-sm text-gray-400">Paso 2 de 3</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutGridIcon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-6 pb-6">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Preview del layout seleccionado */}
        {selectedLayout && (
          <section className="px-6 pb-6">
            <LayoutPreview
              layout={selectedLayout}
              photos={photos}
              fillMode={fillMode}
              overrideQuantity={photos.length === 1 ? totalQuantity : undefined}
            />
          </section>
        )}

        {/* Selector de layout */}
        <section className="px-6 pb-6">
          <LayoutSelector
            photos={photos}
            onSelect={handleLayoutSelect}
            onPhotosChange={handlePhotosChange}
            selectedLayoutId={selectedLayout?.id}
            initialQuantity={totalQuantity}
          />
        </section>
      </div>

      {/* Continue Button */}
      <section className="px-6 pb-8 mt-auto bg-white border-t border-gray-100 pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedLayout}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-2xl transition-all",
            !selectedLayout && "bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200"
          )}
        >
          {selectedLayout ? (
            <>
              Continuar
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </>
          ) : (
            "Selecciona un tamano"
          )}
        </Button>
      </section>
    </div>
  );
}
