"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloudIcon, XIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateImageResolution, type ValidationResult } from "@/lib/utils/image-validation";
import { convertHeicToJpeg, isHeicFile } from "@/lib/utils/heic-converter";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "converting" | "uploading" | "done" | "error";
  validation?: ValidationResult;
  error?: string;
}

interface DropZoneProps {
  onFilesReady: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  productType: "photo" | "document" | "collage" | "poster";
}

export function DropZone({
  onFilesReady,
  maxFiles = 10,
  maxSizeMB = 10,
  productType,
}: DropZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(
    async (file: File): Promise<UploadedFile> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let processedFile = file;
      let preview = "";

      // Convertir HEIC a JPEG si es necesario
      if (isHeicFile(file)) {
        try {
          processedFile = await convertHeicToJpeg(file);
        } catch {
          return {
            id,
            file,
            preview: "",
            progress: 0,
            status: "error",
            error: "Error al convertir formato HEIC",
          };
        }
      }

      // Crear preview
      preview = URL.createObjectURL(processedFile);

      // Validar resolucion
      const validation = await validateImageResolution(processedFile);

      return {
        id,
        file: processedFile,
        preview,
        progress: 100,
        status: "done",
        validation,
      };
    },
    []
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Manejar archivos rechazados
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => {
          if (e.code === "file-too-large") {
            return `Archivo muy grande. Maximo ${maxSizeMB}MB`;
          }
          if (e.code === "file-invalid-type") {
            return "Formato no soportado";
          }
          return e.message;
        });
        toast.error(`${rejection.file.name}: ${errors.join(", ")}`);
      });

      // Verificar limite de archivos
      const totalFiles = files.length + acceptedFiles.length;
      if (totalFiles > maxFiles) {
        toast.error(`Maximo ${maxFiles} archivos permitidos`);
        return;
      }

      if (acceptedFiles.length === 0) return;

      setIsProcessing(true);

      // Agregar archivos en estado "pending"
      const pendingFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: "",
        progress: 0,
        status: "converting" as const,
      }));

      setFiles((prev) => [...prev, ...pendingFiles]);

      // Procesar archivos
      const processedFiles = await Promise.all(
        acceptedFiles.map((file) => processFile(file))
      );

      // Actualizar estado con archivos procesados
      setFiles((prev) => {
        const updated = [...prev];
        processedFiles.forEach((processed, index) => {
          const pendingIndex = updated.findIndex(
            (f) => f.file.name === acceptedFiles[index].name && f.status === "converting"
          );
          if (pendingIndex !== -1) {
            updated[pendingIndex] = processed;
          }
        });
        return updated;
      });

      setIsProcessing(false);

      // Notificar archivos listos
      const readyFiles = processedFiles.filter((f) => f.status === "done");
      if (readyFiles.length > 0) {
        onFilesReady(readyFiles);
      }
    },
    [files.length, maxFiles, maxSizeMB, processFile, onFilesReady]
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
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles,
    disabled: isProcessing,
  });

  const getQualityColor = (quality?: ValidationResult["quality"]) => {
    switch (quality) {
      case "excellent":
        return "text-green-600";
      case "acceptable":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  const getQualityLabel = (quality?: ValidationResult["quality"]) => {
    switch (quality) {
      case "excellent":
        return "Calidad excelente";
      case "acceptable":
        return "Calidad aceptable";
      case "poor":
        return "Resolucion baja";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-sky-500 bg-sky-50"
            : "border-gray-300 hover:border-sky-400 hover:bg-gray-50",
          isProcessing && "opacity-50 cursor-wait"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloudIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? "Solta las fotos aqui" : "Toca para agregar fotos"}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          o arrastra y solta aqui
        </p>
        <p className="text-xs text-gray-400 mt-4">
          JPG, PNG o HEIC. Maximo {maxSizeMB}MB por archivo
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">
            Fotos seleccionadas ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                {/* Preview */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-200 rounded-lg animate-pulse" />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {file.status === "converting" && (
                      <span className="text-xs text-gray-500">Procesando...</span>
                    )}
                    {file.status === "error" && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircleIcon className="w-3 h-3" />
                        {file.error}
                      </span>
                    )}
                    {file.status === "done" && file.validation && (
                      <span
                        className={cn(
                          "text-xs flex items-center gap-1",
                          getQualityColor(file.validation.quality)
                        )}
                      >
                        {file.validation.quality === "excellent" ? (
                          <CheckCircleIcon className="w-3 h-3" />
                        ) : (
                          <AlertCircleIcon className="w-3 h-3" />
                        )}
                        {getQualityLabel(file.validation.quality)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
