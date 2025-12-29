"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/upload/DropZone";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import type { ProductType } from "@/lib/supabase/types";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "converting" | "uploading" | "done" | "error";
  validation?: {
    quality: "excellent" | "acceptable" | "poor";
  };
  error?: string;
}

const productTitles: Record<ProductType, string> = {
  photo: "Subir foto",
  document: "Subir documento",
  poster: "Subir foto para poster",
};

const productDescriptions: Record<ProductType, string> = {
  photo: "Selecciona la foto que queres imprimir",
  document: "Selecciona el documento que queres imprimir",
  poster: "Selecciona la foto para tu poster",
};

const maxFilesPerType: Record<ProductType, number> = {
  photo: 1,
  document: 1,
  poster: 1,
};

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productType = (searchParams.get("type") as ProductType) || "photo";
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFilesReady = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(() => {
      // Para foto simple, documento y poster, reemplazar con un solo archivo
      return files.slice(0, 1);
    });
  }, []);

  const handleContinue = () => {
    if (uploadedFiles.length === 0) return;

    // Guardar archivos en sessionStorage para el editor
    const filesData = uploadedFiles.map((f) => ({
      id: f.id,
      name: f.file.name,
      preview: f.preview,
      width: f.validation?.quality === "excellent" ? 1200 : 800, // Simplificado
      height: f.validation?.quality === "excellent" ? 1800 : 1200,
    }));

    sessionStorage.setItem("uploadedFiles", JSON.stringify(filesData));

    // Navegar al editor
    router.push(`/editor?type=${productType}`);
  };

  const canContinue =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === "done");

  const minFilesMessage: string | null = null;

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Volver</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {productTitles[productType]}
            </h1>
            <p className="text-gray-600 mt-1">
              {productDescriptions[productType]}
            </p>
          </div>

          {/* DropZone */}
          <DropZone
            onFilesReady={handleFilesReady}
            maxFiles={maxFilesPerType[productType]}
            maxSizeMB={10}
            productType={productType}
          />

          {/* Validation message */}
          {minFilesMessage && (
            <p className="text-center text-sm text-amber-600 mt-4">
              {minFilesMessage}
            </p>
          )}

          {/* Continue button */}
          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              Continuar
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  );
}
