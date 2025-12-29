"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ImageIcon,
  MonitorIcon,
  UploadCloudIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useDropzone, FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { validateImageResolution, type ValidationResult } from "@/lib/utils/image-validation";
import { convertHeicToJpeg, isHeicFile } from "@/lib/utils/heic-converter";
import { QualityIndicator, QualityPulse } from "@/components/feedback/QualityIndicator";
import { Spinner, ProcessingOverlay } from "@/components/feedback/LoadingStates";
import type { ProductType } from "@/lib/supabase/types";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: "converting" | "processing" | "done" | "error";
  validation?: ValidationResult;
  error?: string;
}

const productTypes: {
  id: ProductType;
  label: string;
  description: string;
  icon: typeof ImageIcon;
  maxFiles: number;
}[] = [
  {
    id: "photo",
    label: "Una foto",
    description: "Imprime una foto en el tamano que elijas",
    icon: ImageIcon,
    maxFiles: 1,
  },
  {
    id: "poster",
    label: "Poster",
    description: "Imprime grande en varias hojas",
    icon: MonitorIcon,
    maxFiles: 1,
  },
];

export default function NuevoPage() {
  const router = useRouter();
  const { setProductType, addImages, clearImages } = useOrder();
  const [selectedType, setSelectedType] = useState<ProductType>("photo");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentProduct = productTypes.find((p) => p.id === selectedType)!;

  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let processedFile = file;

    // Convertir HEIC si es necesario
    if (isHeicFile(file)) {
      try {
        processedFile = await convertHeicToJpeg(file);
      } catch {
        return {
          id,
          file,
          preview: "",
          status: "error",
          error: "Error al convertir formato HEIC",
        };
      }
    }

    // Crear preview
    const preview = URL.createObjectURL(processedFile);

    // Validar resolucion
    const validation = await validateImageResolution(processedFile);

    return {
      id,
      file: processedFile,
      preview,
      status: "done",
      validation,
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Manejar archivos rechazados
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => {
          if (e.code === "file-too-large") return "Archivo muy grande (max 10MB)";
          if (e.code === "file-invalid-type") return "Formato no soportado";
          return e.message;
        });
        toast.error(`${rejection.file.name}: ${errors.join(", ")}`);
      });

      const maxFiles = currentProduct.maxFiles;
      const totalFiles = files.length + acceptedFiles.length;

      if (totalFiles > maxFiles) {
        toast.error(`Maximo ${maxFiles} ${maxFiles === 1 ? "foto" : "fotos"} para ${currentProduct.label}`);
        return;
      }

      if (acceptedFiles.length === 0) return;

      setIsProcessing(true);

      // Agregar archivos en estado procesando
      const pendingFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: "",
        status: "processing" as const,
      }));

      setFiles((prev) => [...prev, ...pendingFiles]);

      // Procesar archivos
      const processedFiles = await Promise.all(
        acceptedFiles.map((file) => processFile(file))
      );

      // Actualizar estado
      setFiles((prev) => {
        const updated = prev.filter((f) => f.status !== "processing");
        return [...updated, ...processedFiles];
      });

      setIsProcessing(false);
    },
    [files.length, currentProduct, processFile]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/heic": [".heic", ".HEIC"],
      "image/heif": [".heif", ".HEIF"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: currentProduct.maxFiles,
    disabled: isProcessing,
  });

  const canContinue =
    files.length > 0 &&
    files.every((f) => f.status === "done");

  const handleContinue = () => {
    // Limpiar imagenes anteriores y guardar en contexto
    clearImages();
    setProductType(selectedType);
    addImages(
      files.map((f) => ({
        id: f.id,
        file: f.file,
        preview: f.preview,
        publicUrl: f.preview,
        width: f.validation?.width || 0,
        height: f.validation?.height || 0,
        originalName: f.file.name,
      }))
    );

    // Guardar en sessionStorage para la pagina de preview
    sessionStorage.setItem(
      "uploadedFiles",
      JSON.stringify(
        files.map((f) => ({
          id: f.id,
          preview: f.preview,
          name: f.file.name,
          validation: f.validation,
        }))
      )
    );

    // Navegar a preview
    router.push(`/preview?type=${selectedType}`);
  };

  const getOverallQuality = (): "excellent" | "acceptable" | "poor" | null => {
    if (files.length === 0) return null;
    const qualities = files
      .filter((f) => f.validation)
      .map((f) => f.validation!.quality);
    if (qualities.includes("poor")) return "poor";
    if (qualities.includes("acceptable")) return "acceptable";
    return "excellent";
  };

  const overallQuality = getOverallQuality();

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 text-center"
        >
          Que quieres imprimir?
        </motion.h1>
      </header>

      {/* Product Type Selector */}
      <section className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {productTypes.map((product, index) => (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setSelectedType(product.id);
                // Limpiar fotos si cambia el tipo y hay incompatibilidad
                if (product.maxFiles < files.length) {
                  setFiles([]);
                }
              }}
              className={cn(
                "flex-shrink-0 flex flex-col items-center p-4 rounded-2xl border-2 transition-all min-w-[100px]",
                selectedType === product.id
                  ? "border-sky-500 bg-sky-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <product.icon
                className={cn(
                  "w-8 h-8 mb-2",
                  selectedType === product.id ? "text-sky-600" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  selectedType === product.id ? "text-sky-700" : "text-gray-700"
                )}
              >
                {product.label}
              </span>
            </motion.button>
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center mt-2">
          {currentProduct.description}
        </p>
      </section>

      {/* Upload Area */}
      <section className="flex-1 px-4 pb-4">
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all min-h-[200px] flex flex-col items-center justify-center",
            isDragActive
              ? "border-sky-500 bg-sky-50"
              : files.length > 0
              ? "border-gray-300 bg-gray-50"
              : "border-gray-300 hover:border-sky-400 hover:bg-gray-50",
            isProcessing && "opacity-50 cursor-wait"
          )}
        >
          <input {...getInputProps()} />

          {files.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mb-4">
                <UploadCloudIcon className="w-8 h-8 text-sky-500" />
              </div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? "Suelta las fotos aqui" : "Toca para agregar fotos"}
              </p>
              <p className="text-sm text-gray-500 mt-1">o arrastra y suelta</p>
              <p className="text-xs text-gray-400 mt-3">
                JPG, PNG o HEIC. Max 10MB
              </p>
            </motion.div>
          ) : (
            <div className="w-full">
              {/* Preview Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <AnimatePresence mode="popLayout">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-200"
                    >
                      {file.preview && (
                        <img
                          src={file.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Status indicator */}
                      {file.status === "processing" && (
                        <ProcessingOverlay message="Procesando..." />
                      )}

                      {file.status === "done" && file.validation && (
                        <div className="absolute top-1 left-1">
                          <QualityPulse quality={file.validation.quality} size="sm" />
                        </div>
                      )}

                      {file.status === "error" && (
                        <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                          <AlertCircleIcon className="w-6 h-6 text-white" />
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {/* Add more placeholder */}
                  {files.length < currentProduct.maxFiles && (
                    <motion.div
                      layout
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                    >
                      <UploadCloudIcon className="w-6 h-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-sm text-gray-500">
                {files.length} de {currentProduct.maxFiles}{" "}
                {currentProduct.maxFiles === 1 ? "foto" : "fotos"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Quality Indicator */}
      <AnimatePresence>
        {overallQuality && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-4"
          >
            <QualityIndicator
              quality={overallQuality}
              showDetails={false}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Continue Button */}
      <section className="px-4 pb-8 mt-auto">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isProcessing}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-2xl transition-all",
            canContinue
              ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30"
              : "bg-gray-200 text-gray-500"
          )}
        >
          {isProcessing ? (
            <Spinner size="sm" className="mr-2" />
          ) : canContinue ? (
            <CheckCircleIcon className="w-5 h-5 mr-2" />
          ) : null}
          {isProcessing
            ? "Procesando..."
            : canContinue
            ? "Continuar"
            : "Agrega una foto"}
          {canContinue && <ChevronRightIcon className="w-5 h-5 ml-2" />}
        </Button>

        {/* Link to check order status */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Ya hiciste un pedido?{" "}
          <a href="/estado" className="text-sky-600 font-medium hover:underline">
            Consulta el estado aqui
          </a>
        </p>
      </section>
    </div>
  );
}
