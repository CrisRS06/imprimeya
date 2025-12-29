"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrder } from "@/lib/context/OrderContext";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "lucide-react";
import type { ProductType } from "@/lib/supabase/types";

// Cargar Fabric.js solo en cliente
const FabricCanvas = dynamic(
  () => import("@/components/editor/FabricCanvas").then((mod) => mod.FabricCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

const sizeOptions = Object.entries(PRINT_SIZES).map(([name, data]) => ({
  value: name as PrintSizeName,
  label: `${name} (${data.width}" x ${data.height}")`,
}));

function EditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setPrintOptions } = useOrder();

  const productType = (searchParams.get("type") as ProductType) || state.productType;
  const [mode, setMode] = useState<"fit" | "fill">("fill");
  const [showGuides, setShowGuides] = useState(true);
  const [selectedSize, setSelectedSize] = useState<PrintSizeName>(
    state.printOptions.sizeName || "4x6"
  );

  // Obtener imagen a editar
  const currentImage = state.images[0];

  useEffect(() => {
    // Si no hay imagen, redirigir a upload
    if (!currentImage && state.images.length === 0) {
      // Verificar sessionStorage para datos de preview
      const savedFiles = sessionStorage.getItem("uploadedFiles");
      if (!savedFiles) {
        router.push(`/upload?type=${productType || "single_photo"}`);
      }
    }
  }, [currentImage, state.images, productType, router]);

  // Cargar datos de sessionStorage si existen
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedFiles = sessionStorage.getItem("uploadedFiles");
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles);
        if (files.length > 0) {
          setPreviewUrl(files[0].preview);
        }
      } catch {
        // Ignorar error
      }
    } else if (currentImage?.preview) {
      setPreviewUrl(currentImage.preview);
    } else if (currentImage?.publicUrl) {
      setPreviewUrl(currentImage.publicUrl);
    }
  }, [currentImage]);

  const handleSizeChange = (value: string) => {
    setSelectedSize(value as PrintSizeName);
    setPrintOptions({ sizeName: value as PrintSizeName });
  };

  const handleContinue = () => {
    router.push(`/opciones?type=${productType}`);
  };

  const imageUrl = previewUrl || currentImage?.preview || currentImage?.publicUrl;

  if (!imageUrl) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No hay imagen para editar</p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="mt-4"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Volver</span>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Editar foto</h1>
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Controles superiores */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Selector de tamano */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Tamano:
                </label>
                <Select value={selectedSize} onValueChange={handleSizeChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modo y guias */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={mode === "fill" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("fill")}
                  className="flex-1 min-w-[120px]"
                >
                  <MaximizeIcon className="w-4 h-4 mr-2" />
                  Llenar
                </Button>
                <Button
                  variant={mode === "fit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("fit")}
                  className="flex-1 min-w-[120px]"
                >
                  <MinimizeIcon className="w-4 h-4 mr-2" />
                  Ajustar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuides(!showGuides)}
                  className="min-w-[100px]"
                >
                  {showGuides ? (
                    <>
                      <EyeOffIcon className="w-4 h-4 mr-2" />
                      Ocultar guias
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Ver guias
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instrucciones */}
          <p className="text-sm text-gray-600 text-center">
            {mode === "fill"
              ? "Arrastra la imagen para ajustar el encuadre. Todo lo que este fuera de la linea azul sera cortado."
              : "La imagen se ajusta sin recortar. Pueden quedar bordes blancos."}
          </p>

          {/* Canvas */}
          <FabricCanvas
            imageUrl={imageUrl}
            sizeName={selectedSize}
            mode={mode}
            showGuides={showGuides}
          />

          {/* Boton continuar */}
          <Button
            onClick={handleContinue}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Continuar
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  );
}
