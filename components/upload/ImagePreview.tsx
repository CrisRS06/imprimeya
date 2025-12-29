"use client";

import { useState, useEffect } from "react";
import { XIcon, AlertCircleIcon, CheckCircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateImageResolution,
  type ValidationResult,
  type PrintSizeName,
} from "@/lib/utils/image-validation";

interface ImagePreviewProps {
  file: File;
  preview: string;
  onRemove: () => void;
  targetSize?: PrintSizeName;
  showValidation?: boolean;
  status?: "pending" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}

export function ImagePreview({
  file,
  preview,
  onRemove,
  targetSize,
  showValidation = true,
  status = "done",
  progress = 100,
  error,
}: ImagePreviewProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (showValidation && file) {
      setIsValidating(true);
      validateImageResolution(file, targetSize)
        .then(setValidation)
        .finally(() => setIsValidating(false));
    }
  }, [file, targetSize, showValidation]);

  const getQualityConfig = () => {
    if (!validation) return null;

    switch (validation.quality) {
      case "excellent":
        return {
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          icon: <CheckCircleIcon className="w-4 h-4" />,
          label: "Calidad excelente",
          description: `${validation.width}x${validation.height}px - ${validation.dpi} DPI`,
        };
      case "acceptable":
        return {
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          icon: <AlertCircleIcon className="w-4 h-4" />,
          label: "Calidad aceptable",
          description: validation.message,
        };
      case "poor":
        return {
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          icon: <AlertCircleIcon className="w-4 h-4" />,
          label: "Resolucion baja",
          description: validation.maxRecommendedSize
            ? `Recomendado maximo: ${validation.maxRecommendedSize}`
            : "No recomendado para impresion",
        };
    }
  };

  const qualityConfig = getQualityConfig();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        "relative group rounded-xl overflow-hidden border-2 transition-all",
        status === "error"
          ? "border-red-300 bg-red-50"
          : qualityConfig?.borderColor || "border-gray-200 bg-white"
      )}
    >
      {/* Imagen */}
      <div className="relative aspect-square">
        <img
          src={preview}
          alt={file.name}
          className="w-full h-full object-cover"
        />

        {/* Overlay de progreso */}
        {status === "uploading" && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <Loader2Icon className="w-8 h-8 text-white animate-spin mb-2" />
            <div className="w-3/4 h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-white text-sm mt-1">{progress}%</span>
          </div>
        )}

        {/* Boton eliminar */}
        <button
          onClick={onRemove}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full transition-all",
            "bg-black/50 text-white hover:bg-red-500",
            "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        {/* Nombre de archivo */}
        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </p>

        {/* Tamano */}
        <p className="text-xs text-gray-500 mt-0.5">
          {formatFileSize(file.size)}
        </p>

        {/* Validacion de calidad */}
        {showValidation && (
          <div className="mt-2">
            {isValidating ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2Icon className="w-3 h-3 animate-spin" />
                <span>Validando...</span>
              </div>
            ) : qualityConfig ? (
              <div
                className={cn(
                  "flex items-start gap-1.5 text-xs p-2 rounded-lg",
                  qualityConfig.bgColor
                )}
              >
                <span className={qualityConfig.color}>{qualityConfig.icon}</span>
                <div>
                  <p className={cn("font-medium", qualityConfig.color)}>
                    {qualityConfig.label}
                  </p>
                  <p className="text-gray-600 mt-0.5">{qualityConfig.description}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Error */}
        {status === "error" && error && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
            <AlertCircleIcon className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
