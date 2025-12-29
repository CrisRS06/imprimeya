"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Skeleton loader para imagenes
 */
interface ImageSkeletonProps {
  aspectRatio?: string;
  className?: string;
}

export function ImageSkeleton({ aspectRatio = "4/3", className }: ImageSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gray-200",
        className
      )}
      style={{ aspectRatio }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/**
 * Skeleton loader para cards
 */
interface CardSkeletonProps {
  lines?: number;
  className?: string;
}

export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn("p-4 rounded-xl border bg-white", className)}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-gray-200 rounded animate-pulse"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Spinner circular con progreso opcional
 */
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  progress?: number; // 0-100
  className?: string;
}

export function Spinner({ size = "md", progress, className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
    xl: "w-16 h-16 border-4",
  };

  if (progress !== undefined) {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={cn("relative", className)}>
        <svg className={sizeClasses[size]} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3 }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-full border-sky-500 border-t-transparent animate-spin",
        className
      )}
    />
  );
}

/**
 * Dots animados para estados de espera
 */
interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <span className={cn("inline-flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Overlay de procesamiento para imagenes
 */
interface ProcessingOverlayProps {
  message?: string;
  progress?: number;
  className?: string;
}

export function ProcessingOverlay({
  message = "Procesando...",
  progress,
  className,
}: ProcessingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl",
        className
      )}
    >
      <Spinner size="lg" progress={progress} />
      <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
      {progress !== undefined && (
        <div className="mt-2 w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sky-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Placeholder de imagen con icono
 */
interface ImagePlaceholderProps {
  icon?: React.ReactNode;
  message?: string;
  aspectRatio?: string;
  className?: string;
}

export function ImagePlaceholder({
  icon,
  message = "Sin imagen",
  aspectRatio = "4/3",
  className,
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl bg-gray-100 border-2 border-dashed border-gray-300",
        className
      )}
      style={{ aspectRatio }}
    >
      {icon && <div className="text-gray-400 mb-2">{icon}</div>}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

/**
 * Skeleton para el selector de tamanos
 */
export function SizeSelectorSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-20 h-24 rounded-xl bg-gray-200 animate-pulse"
        />
      ))}
    </div>
  );
}

/**
 * Estado de carga completo para la pagina de preview
 */
export function PreviewPageSkeleton() {
  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-sky-50 to-white p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Image skeleton */}
      <ImageSkeleton aspectRatio="4/6" className="mb-4" />

      {/* Size selector skeleton */}
      <SizeSelectorSkeleton />

      {/* Quality indicator skeleton */}
      <div className="mt-4 h-16 bg-gray-200 rounded-xl animate-pulse" />

      {/* Button skeleton */}
      <div className="mt-auto h-14 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}
