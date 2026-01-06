"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  UploadIcon,
  XIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useDropzone, FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/lib/context/OrderContext";
import { validateImageResolution, type ValidationResult } from "@/lib/utils/image-validation";
import { convertHeicToJpeg, isHeicFile } from "@/lib/utils/heic-converter";
import { compressImage, formatFileSize } from "@/lib/utils/image-compressor";
import { QualityPulse } from "@/components/feedback/QualityIndicator";
import { ProcessingOverlay } from "@/components/feedback/LoadingStates";
import { MAX_UPLOAD_SIZE, UPLOAD_TIMEOUT_MS, MAX_FILES_PER_SESSION, MAX_CONCURRENT_UPLOADS } from "@/lib/constants";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  storagePath?: string;
  publicUrl?: string;
  status: "converting" | "processing" | "uploading" | "done" | "error";
  validation?: ValidationResult;
  error?: string;
}

const MAX_FILES = MAX_FILES_PER_SESSION;

/**
 * Procesa items con concurrencia limitada para evitar bloquear la UI
 * @param items - Array de items a procesar
 * @param processor - Función que procesa cada item
 * @param concurrency - Número máximo de operaciones simultáneas
 */
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = MAX_CONCURRENT_UPLOADS
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const result = await processor(items[index], index);
      results[index] = result;
    }
  }

  // Iniciar `concurrency` workers en paralelo
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, processNext);
  await Promise.all(workers);

  return results;
}

export default function FotosPage() {
  const router = useRouter();
  const { setProductType, addImages, clearImages } = useOrder();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview && f.preview.startsWith("blob:")) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let processedFile = file;

    // Paso 1: Convertir HEIC si es necesario
    if (isHeicFile(file)) {
      try {
        processedFile = await convertHeicToJpeg(file);
      } catch {
        toast.error(`${file.name}: Error al convertir formato HEIC`);
        return {
          id,
          file,
          preview: "",
          status: "error",
          error: "Error al convertir formato HEIC. Intenta con otro archivo.",
        };
      }
    }

    // Paso 2: Comprimir si es necesario (límite de Vercel: 4.5MB)
    if (processedFile.size > MAX_UPLOAD_SIZE) {
      const compressionResult = await compressImage(processedFile);

      if (!compressionResult.success) {
        toast.error(`${file.name}: ${compressionResult.error}`);
        return {
          id,
          file,
          preview: "",
          status: "error",
          error: compressionResult.error || "No se pudo comprimir la imagen",
        };
      }

      // Compresión exitosa
      processedFile = compressionResult.file;
      console.log(
        `Imagen comprimida: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)}`
      );
    }

    // Paso 3: Validar resolución para impresión
    const preview = URL.createObjectURL(processedFile);
    const validation = await validateImageResolution(processedFile);

    // Paso 4: Subir a servidor con timeout
    let storagePath: string | undefined;
    let publicUrl: string | undefined;
    let uploadError: string | undefined;

    try {
      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("sessionId", sessionStorage.getItem("uploadSessionId") || id);

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          storagePath = data.data.path;
          publicUrl = data.data.publicUrl;

          if (data.data.sessionId) {
            sessionStorage.setItem("uploadSessionId", data.data.sessionId);
          }
        } else {
          // Manejar errores HTTP específicos
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 413) {
            uploadError = "Imagen muy grande para el servidor";
          } else if (response.status === 429) {
            uploadError = "Demasiadas subidas. Espera un momento.";
          } else {
            uploadError = errorData.error || "Error del servidor";
          }
          toast.error(`${file.name}: ${uploadError}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          uploadError = "La subida tardó demasiado. Verifica tu conexión.";
        } else {
          uploadError = "Error de conexión. Verifica tu internet.";
        }
        toast.error(`${file.name}: ${uploadError}`);
      }
    } catch (err) {
      uploadError = "Error inesperado al subir";
      console.error("Upload error:", err);
    }

    return {
      id,
      file: processedFile,
      preview,
      storagePath,
      publicUrl,
      status: storagePath ? "done" : "error",
      validation,
      error: uploadError,
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => {
          if (e.code === "file-too-large") return "Archivo muy grande (max 10MB)";
          if (e.code === "file-invalid-type") return "Formato no soportado";
          return e.message;
        });
        toast.error(`${rejection.file.name}: ${errors.join(", ")}`);
      });

      const totalFiles = files.length + acceptedFiles.length;
      if (totalFiles > MAX_FILES) {
        toast.error(`Máximo ${MAX_FILES} imágenes permitidas`);
        return;
      }

      if (acceptedFiles.length === 0) return;

      setIsProcessing(true);

      // Crear IDs únicos para cada archivo
      const fileIds = acceptedFiles.map(() =>
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      );

      // Agregar archivos como "pendientes" (en cola)
      const pendingFiles: UploadedFile[] = acceptedFiles.map((file, i) => ({
        id: fileIds[i],
        file,
        preview: "",
        status: "processing" as const,
      }));

      setFiles((prev) => [...prev, ...pendingFiles]);

      // Procesar con concurrencia limitada (2 a la vez)
      // Actualiza la UI después de cada archivo completado
      await processWithConcurrency(
        acceptedFiles,
        async (file, index) => {
          const result = await processFile(file);
          const resultWithId = { ...result, id: fileIds[index] };

          // Actualizar UI inmediatamente después de cada archivo
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileIds[index] ? resultWithId : f
            )
          );

          return resultWithId;
        },
        MAX_CONCURRENT_UPLOADS
      );

      setIsProcessing(false);
    },
    [files.length, processFile]
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

  const retryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = files.find((f) => f.id === fileId);
    if (!fileToRetry?.file) return;

    // Marcar como procesando
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: "processing" as const, error: undefined }
          : f
      )
    );

    try {
      // Re-ejecutar el pipeline completo
      const processed = await processFile(fileToRetry.file);

      // Actualizar con el resultado, manteniendo el ID original
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...processed, id: fileId }
            : f
        )
      );

      if (processed.status === "done") {
        toast.success(`${fileToRetry.file.name} subida correctamente`);
      }
    } catch (error) {
      console.error("Retry error:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error" as const, error: "Error al reintentar. Intenta de nuevo." }
            : f
        )
      );
    }
  }, [files, processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/heic": [".heic", ".HEIC"],
      "image/heif": [".heif", ".HEIF"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: MAX_FILES,
    disabled: isProcessing,
  });

  const canContinue =
    files.length > 0 && files.every((f) => f.status === "done" && f.storagePath);

  const handleContinue = () => {
    clearImages();
    setProductType("photo");
    addImages(
      files.map((f) => ({
        id: f.id,
        file: f.file,
        preview: f.preview,
        publicUrl: f.publicUrl || f.preview,
        width: f.validation?.width || 0,
        height: f.validation?.height || 0,
        originalName: f.file.name,
      }))
    );

    sessionStorage.setItem(
      "uploadedPhotos",
      JSON.stringify(
        files.map((f) => ({
          id: f.id,
          preview: f.publicUrl || f.preview,
          name: f.file.name,
          storagePath: f.storagePath,
          publicUrl: f.publicUrl,
          validation: f.validation,
          quantity: 1,
        }))
      )
    );

    router.push("/fotos/layout");
  };

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black">Imágenes</h1>
            <p className="text-sm text-gray-400">Paso 1 de 3</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-6 pb-6">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Upload Area */}
      <section className="flex-1 px-6 pb-4">
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[280px] flex flex-col items-center justify-center",
            isDragActive
              ? "border-primary bg-primary/5"
              : files.length > 0
              ? "border-gray-200 bg-gray-50/50"
              : "border-gray-200 hover:border-primary/50 hover:bg-gray-50",
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
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                <UploadIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-black">
                {isDragActive ? "Suelta las imágenes aquí" : "Agregar imágenes"}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Toca para seleccionar o arrastra y suelta
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500">JPG</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500">PNG</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500">HEIC</span>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Max 10MB por imagen - Hasta {MAX_FILES} imágenes
              </p>
            </motion.div>
          ) : (
            <div className="w-full">
              {/* Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                <AnimatePresence mode="popLayout">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                    >
                      {file.preview && (
                        <img
                          src={file.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {file.status === "processing" && (
                        <ProcessingOverlay message="" />
                      )}

                      {file.status === "done" && file.validation && (
                        <div className="absolute top-1 left-1">
                          <QualityPulse quality={file.validation.quality} size="sm" />
                        </div>
                      )}

                      {file.status === "error" && (
                        <div className="absolute inset-0 bg-destructive/90 flex flex-col items-center justify-center gap-1 p-2">
                          <AlertCircleIcon className="w-5 h-5 text-white" />
                          <span className="text-[10px] text-white/90 text-center line-clamp-2 px-1">
                            {file.error || "Error"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retryUpload(file.id);
                            }}
                            className="mt-1 px-2.5 py-1 bg-white text-destructive rounded-full text-[10px] font-medium hover:bg-white/90 transition-colors flex items-center gap-1"
                          >
                            <RefreshCwIcon className="w-3 h-3" />
                            Reintentar
                          </button>
                        </div>
                      )}

                      {file.status === "done" && !file.storagePath && (
                        <div className="absolute inset-0 bg-amber-500/90 flex flex-col items-center justify-center gap-1 p-2">
                          <AlertCircleIcon className="w-5 h-5 text-white" />
                          <span className="text-[10px] text-white/90 text-center">
                            No se subió
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retryUpload(file.id);
                            }}
                            className="mt-1 px-2.5 py-1 bg-white text-amber-600 rounded-full text-[10px] font-medium hover:bg-white/90 transition-colors flex items-center gap-1"
                          >
                            <RefreshCwIcon className="w-3 h-3" />
                            Reintentar
                          </button>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="absolute top-1 right-1 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        aria-label="Eliminar foto"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {files.length < MAX_FILES && (
                    <motion.div
                      layout
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <UploadIcon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-sm text-gray-600 font-medium">
                {files.length} {files.length === 1 ? "imagen" : "imágenes"} seleccionadas
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Toca para agregar mas
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-4">
        <div className="bg-gray-50 rounded-2xl p-5">
          <h3 className="font-medium text-black mb-3">Como funciona</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</div>
              <p className="text-sm text-gray-600">Sube las imágenes que quieres imprimir</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">2</div>
              <p className="text-sm text-gray-400">Elige el tamano y cantidad</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">3</div>
              <p className="text-sm text-gray-400">Selecciona el tipo de papel</p>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Button */}
      <section className="px-6 pb-8 mt-auto">
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isProcessing}
          className={cn(
            "w-full h-14 text-base font-semibold rounded-2xl transition-all",
            !canContinue && "bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200"
          )}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Procesando...
            </span>
          ) : canContinue ? (
            <>
              Continuar
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </>
          ) : (
            "Agrega al menos una imagen"
          )}
        </Button>
      </section>
    </div>
  );
}
