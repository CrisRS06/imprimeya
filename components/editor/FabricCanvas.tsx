"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, FabricImage } from "fabric";
import { useGesture } from "@use-gesture/react";
import { cn } from "@/lib/utils";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import { hapticFeedback } from "@/hooks/useCanvasGestures";
import type { CropResult } from "@/lib/services/auto-crop";

interface FabricCanvasProps {
  imageUrl: string;
  sizeName: PrintSizeName;
  mode: "fit" | "fill";
  showGuides?: boolean;
  autoCrop?: CropResult | null;
  onCanvasReady?: (canvas: Canvas) => void;
  onImageChange?: (data: { scale: number; x: number; y: number }) => void;
  className?: string;
}

// Constantes de impresion
const BLEED_INCHES = 0.125;
const SAFE_ZONE_INCHES = 0.25;
const CANVAS_SCALE = 100; // Pixeles por pulgada en el preview

// Constantes de touch - optimizadas para movil
const TOUCH_CORNER_SIZE = 44; // Tamano minimo recomendado para touch (44px)
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

export function FabricCanvas({
  imageUrl,
  sizeName,
  mode,
  showGuides = false, // Por defecto ocultas para simplificar
  autoCrop,
  onCanvasReady,
  onImageChange,
  className,
}: FabricCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const imageRef = useRef<FabricImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGesturing, setIsGesturing] = useState(false);

  // Estado para gestos
  const gestureStateRef = useRef({
    initialScale: 1,
    initialX: 0,
    initialY: 0,
  });

  const size = PRINT_SIZES[sizeName];

  // Dimensiones del canvas (con bleed)
  const canvasWidth = (size.width + BLEED_INCHES * 2) * CANVAS_SCALE;
  const canvasHeight = (size.height + BLEED_INCHES * 2) * CANVAS_SCALE;

  // Zona de trim (sin bleed)
  const trimX = BLEED_INCHES * CANVAS_SCALE;
  const trimY = BLEED_INCHES * CANVAS_SCALE;
  const trimWidth = size.width * CANVAS_SCALE;
  const trimHeight = size.height * CANVAS_SCALE;

  // Aplicar transformacion a la imagen
  const applyTransform = useCallback(
    (scale: number, x: number, y: number) => {
      if (!fabricRef.current || !imageRef.current) return;

      // Limitar escala
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

      imageRef.current.set({
        scaleX: clampedScale,
        scaleY: clampedScale,
        left: x,
        top: y,
      });

      imageRef.current.setCoords();
      fabricRef.current.requestRenderAll();

      onImageChange?.({ scale: clampedScale, x, y });
    },
    [onImageChange]
  );

  // Crear overlay de area de impresion (difuminado elegante)
  const createPrintAreaOverlay = useCallback(
    (canvas: Canvas) => {
      // Limpiar overlays existentes
      const existingOverlays = canvas.getObjects().filter(
        (obj) => (obj as { data?: { isOverlay?: boolean } }).data?.isOverlay
      );
      existingOverlays.forEach((overlay) => canvas.remove(overlay));

      if (!showGuides) return;

      // En lugar de lineas tecnicas, creamos un borde sutil
      // que indica el area que se imprimira
      const borderRect = new Rect({
        left: trimX - 2,
        top: trimY - 2,
        width: trimWidth + 4,
        height: trimHeight + 4,
        fill: "transparent",
        stroke: "rgba(255, 255, 255, 0.8)",
        strokeWidth: 4,
        selectable: false,
        evented: false,
      });
      (borderRect as { data?: object }).data = { isOverlay: true, type: "border" };

      canvas.add(borderRect);
      canvas.bringObjectToFront(borderRect);
    },
    [showGuides, trimX, trimY, trimWidth, trimHeight]
  );

  // Cargar imagen
  const loadImage = useCallback(
    async (canvas: Canvas) => {
      setIsLoading(true);

      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });

        if (!img) {
          setIsLoading(false);
          return;
        }

        // Eliminar imagen anterior
        if (imageRef.current) {
          canvas.remove(imageRef.current);
        }

        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;

        let scale: number;
        let left: number;
        let top: number;

        // Si hay auto-crop, aplicarlo
        if (autoCrop) {
          // Calcular escala para que el crop llene el canvas
          const scaleX = canvasWidth / autoCrop.width;
          const scaleY = canvasHeight / autoCrop.height;
          scale = Math.max(scaleX, scaleY);

          // Centrar basado en el crop
          left = -autoCrop.x * scale + (canvasWidth - autoCrop.width * scale) / 2;
          top = -autoCrop.y * scale + (canvasHeight - autoCrop.height * scale) / 2;
        } else if (mode === "fill") {
          // Llenar completamente (puede recortar)
          const scaleX = canvasWidth / imgWidth;
          const scaleY = canvasHeight / imgHeight;
          scale = Math.max(scaleX, scaleY);
          left = (canvasWidth - imgWidth * scale) / 2;
          top = (canvasHeight - imgHeight * scale) / 2;
        } else {
          // Ajustar sin recortar (puede dejar margenes)
          const scaleX = trimWidth / imgWidth;
          const scaleY = trimHeight / imgHeight;
          scale = Math.min(scaleX, scaleY);
          left = trimX + (trimWidth - imgWidth * scale) / 2;
          top = trimY + (trimHeight - imgHeight * scale) / 2;
        }

        img.set({
          left,
          top,
          scaleX: scale,
          scaleY: scale,
          originX: "left",
          originY: "top",
          // Controles tactiles mejorados
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          // Tamanos de control optimizados para touch
          cornerSize: TOUCH_CORNER_SIZE,
          touchCornerSize: TOUCH_CORNER_SIZE,
          cornerColor: "#0ea5e9",
          cornerStrokeColor: "#ffffff",
          cornerStyle: "circle",
          transparentCorners: false,
          borderColor: "#0ea5e9",
          borderScaleFactor: 2,
          // Padding para area de interaccion mas grande
          padding: 10,
        });

        // Guardar estado inicial para gestos
        gestureStateRef.current = {
          initialScale: scale,
          initialX: left,
          initialY: top,
        };

        imageRef.current = img;
        canvas.add(img);
        canvas.sendObjectToBack(img);

        // Recrear overlay encima de la imagen
        createPrintAreaOverlay(canvas);

        canvas.setActiveObject(img);
        canvas.renderAll();
        setIsLoading(false);

        onImageChange?.({ scale, x: left, y: top });
      } catch (error) {
        console.error("Error loading image:", error);
        setIsLoading(false);
      }
    },
    [imageUrl, mode, autoCrop, canvasWidth, canvasHeight, trimX, trimY, trimWidth, trimHeight, createPrintAreaOverlay, onImageChange]
  );

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: false,
      preserveObjectStacking: true,
      // Configuracion touch
      allowTouchScrolling: false,
    });

    fabricRef.current = canvas;
    onCanvasReady?.(canvas);

    // Eventos de transformacion
    canvas.on("object:modified", (e) => {
      if (e.target === imageRef.current) {
        hapticFeedback("light");
        onImageChange?.({
          scale: e.target.scaleX || 1,
          x: e.target.left || 0,
          y: e.target.top || 0,
        });
        // Actualizar estado inicial
        gestureStateRef.current = {
          initialScale: e.target.scaleX || 1,
          initialX: e.target.left || 0,
          initialY: e.target.top || 0,
        };
      }
    });

    canvas.on("object:scaling", () => {
      setIsGesturing(true);
    });

    canvas.on("object:moving", () => {
      setIsGesturing(true);
    });

    canvas.on("mouse:up", () => {
      setIsGesturing(false);
    });

    // Cargar imagen inicial
    loadImage(canvas);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  // Recargar cuando cambie la imagen, modo o autoCrop
  useEffect(() => {
    if (fabricRef.current) {
      loadImage(fabricRef.current);
    }
  }, [imageUrl, mode, autoCrop, loadImage]);

  // Actualizar overlay cuando cambie showGuides
  useEffect(() => {
    if (fabricRef.current) {
      createPrintAreaOverlay(fabricRef.current);
      fabricRef.current.renderAll();
    }
  }, [showGuides, createPrintAreaOverlay]);

  // Configurar gestos de pinch-to-zoom
  useGesture(
    {
      onPinch: ({ offset: [scale], origin: [ox, oy], first, last, memo }) => {
        if (!fabricRef.current || !imageRef.current) return memo;

        if (first) {
          setIsGesturing(true);
          hapticFeedback("light");
          return {
            startScale: imageRef.current.scaleX || 1,
            startX: imageRef.current.left || 0,
            startY: imageRef.current.top || 0,
          };
        }

        const { startScale, startX, startY } = memo || gestureStateRef.current;

        // Calcular nueva escala
        const newScale = startScale * scale;

        // Obtener posicion relativa al canvas
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const canvasEl = canvasRef.current;
          if (canvasEl) {
            const canvasRect = canvasEl.getBoundingClientRect();
            const centerX = ox - canvasRect.left;
            const centerY = oy - canvasRect.top;

            // Ajustar posicion para zoom centrado en el punto de pinch
            const scaleChange = newScale / startScale;
            const newX = centerX - (centerX - startX) * scaleChange;
            const newY = centerY - (centerY - startY) * scaleChange;

            applyTransform(newScale, newX, newY);
          }
        }

        if (last) {
          setIsGesturing(false);
          hapticFeedback("medium");
          gestureStateRef.current = {
            initialScale: imageRef.current?.scaleX || 1,
            initialX: imageRef.current?.left || 0,
            initialY: imageRef.current?.top || 0,
          };
        }

        return memo;
      },
      onDoubleClick: () => {
        // Double-tap para toggle fill/fit
        if (!fabricRef.current || !imageRef.current) return;

        hapticFeedback("medium");

        const imgWidth = imageRef.current.width || 1;
        const imgHeight = imageRef.current.height || 1;
        const currentScale = imageRef.current.scaleX || 1;

        const fillScale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const fitScale = Math.min(trimWidth / imgWidth, trimHeight / imgHeight);

        // Toggle entre fill y fit
        const tolerance = 0.05;
        let newScale: number;
        let newX: number;
        let newY: number;

        if (Math.abs(currentScale - fillScale) < tolerance * fillScale) {
          // Actualmente en fill, cambiar a fit
          newScale = fitScale;
          newX = trimX + (trimWidth - imgWidth * fitScale) / 2;
          newY = trimY + (trimHeight - imgHeight * fitScale) / 2;
        } else {
          // Cambiar a fill
          newScale = fillScale;
          newX = (canvasWidth - imgWidth * fillScale) / 2;
          newY = (canvasHeight - imgHeight * fillScale) / 2;
        }

        applyTransform(newScale, newX, newY);
        gestureStateRef.current = {
          initialScale: newScale,
          initialX: newX,
          initialY: newY,
        };
      },
    },
    {
      target: containerRef,
      pinch: {
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: true,
      },
      eventOptions: { passive: false },
    }
  );

  return (
    <div ref={containerRef} className={cn("relative touch-none", className)}>
      {/* Canvas container */}
      <div className="overflow-hidden rounded-2xl bg-gray-100 shadow-inner">
        <div
          className="mx-auto relative"
          style={{
            width: canvasWidth,
            maxWidth: "100%",
            aspectRatio: `${canvasWidth} / ${canvasHeight}`,
          }}
        >
          <canvas ref={canvasRef} className="w-full h-auto" />

          {/* Indicador de interaccion */}
          {isGesturing && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-4 border-sky-400 rounded-2xl animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">
              Preparando tu foto...
            </span>
          </div>
        </div>
      )}

      {/* Instruccion tactil simplificada */}
      <div className="mt-3 text-center">
        <p className="text-sm text-gray-500">
          Pellizca para zoom o arrastra para mover
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Doble toque para ajustar automaticamente
        </p>
      </div>
    </div>
  );
}
