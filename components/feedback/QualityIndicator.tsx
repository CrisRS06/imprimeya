"use client";

import { cn } from "@/lib/utils";
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PrintSizeName } from "@/lib/utils/image-validation";

export type QualityLevel = "excellent" | "acceptable" | "poor";

interface QualityIndicatorProps {
  quality: QualityLevel;
  dpi?: number;
  suggestedSize?: PrintSizeName | null;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const qualityConfig: Record<
  QualityLevel,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof CheckCircleIcon;
    label: string;
    message: string;
  }
> = {
  excellent: {
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircleIcon,
    label: "Perfecta",
    message: "Tu foto se vera increible impresa",
  },
  acceptable: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: AlertTriangleIcon,
    label: "Aceptable",
    message: "Puede verse un poco menos nitida",
  },
  poor: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircleIcon,
    label: "Baja calidad",
    message: "La imagen puede verse borrosa o pixelada",
  },
};

export function QualityIndicator({
  quality,
  dpi,
  suggestedSize,
  showDetails = false,
  compact = false,
  className,
}: QualityIndicatorProps) {
  const config = qualityConfig[quality];
  const Icon = config.icon;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          config.bgColor,
          config.color,
          className
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={quality}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-xl border p-4",
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", config.color)}>
                {config.label}
              </span>
              {dpi && showDetails && (
                <span className="text-xs text-gray-500">
                  ({dpi} DPI)
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              {config.message}
            </p>
            {quality === "poor" && suggestedSize && (
              <p className="text-xs text-gray-500 mt-2">
                Sugerencia: Prueba con tamano {suggestedSize} para mejor calidad
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Barra de calidad visual (semaforo)
 */
interface QualityBarProps {
  quality: QualityLevel;
  className?: string;
}

export function QualityBar({ quality, className }: QualityBarProps) {
  const levels: QualityLevel[] = ["poor", "acceptable", "excellent"];
  const activeIndex = levels.indexOf(quality);

  return (
    <div className={cn("flex gap-1", className)}>
      {levels.map((level, index) => (
        <motion.div
          key={level}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "h-1.5 flex-1 rounded-full origin-left",
            index <= activeIndex
              ? level === "excellent"
                ? "bg-emerald-500"
                : level === "acceptable"
                ? "bg-amber-500"
                : "bg-red-500"
              : "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Indicador de calidad con animacion de pulso
 */
interface QualityPulseProps {
  quality: QualityLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QualityPulse({ quality, size = "md", className }: QualityPulseProps) {
  const config = qualityConfig[quality];
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const pulseColor = {
    excellent: "bg-emerald-400",
    acceptable: "bg-amber-400",
    poor: "bg-red-400",
  };

  return (
    <span className={cn("relative flex", sizeClasses[size], className)}>
      <motion.span
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          pulseColor[quality]
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full h-full w-full",
          pulseColor[quality]
        )}
      />
    </span>
  );
}
