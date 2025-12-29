"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, FabricImage, Line, FabricText } from "fabric";
import { useGesture } from "@use-gesture/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PRINT_SIZES, type PrintSizeName } from "@/lib/utils/image-validation";
import {
  type PosterConfig,
  generateSheetPositions,
  calculatePosterDimensions,
} from "@/lib/poster/config";
import { detectOptimalCrop } from "@/lib/services/auto-crop";
import { hapticFeedback } from "@/hooks/useCanvasGestures";
import { Spinner } from "@/components/feedback/LoadingStates";
import { GridIcon, ZoomInIcon, MoveIcon } from "lucide-react";

interface PosterCanvasProps {
  imageUrl: string;
  config: PosterConfig;
  sizeName: PrintSizeName;
  showGrid?: boolean;
  showLabels?: boolean;
  autoCrop?: boolean;
  onCanvasReady?: (canvas: Canvas) => void;
  onImageChange?: (data: { scale: number; x: number; y: number }) => void;
  className?: string;
}

// Escala para preview (menor que foto simple porque el poster es grande)
const CANVAS_SCALE = 40; // Pixeles por pulgada en el preview

// Constantes táctiles
const TOUCH_CORNER_SIZE = 44;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

export function PosterCanvas({
  imageUrl,
  config,
  sizeName,
  showGrid = true,
  showLabels = true,
  autoCrop = true,
  onCanvasReady,
  onImageChange,
  className,
}: PosterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const imageRef = useRef<FabricImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGesturing, setIsGesturing] = useState(false);
  const [showSheetPreview, setShowSheetPreview] = useState(false);

  // Estado para gestos
  const gestureStateRef = useRef({
    initialScale: 1,
    initialX: 0,
    initialY: 0,
  });

  const printSize = PRINT_SIZES[sizeName];
  const dimensions = calculatePosterDimensions(
    config,
    printSize.width,
    printSize.height,
    0 // Sin overlap para preview
  );

  // Dimensiones del canvas
  const canvasWidth = dimensions.totalWidthInches * CANVAS_SCALE;
  const canvasHeight = dimensions.totalHeightInches * CANVAS_SCALE;

  // Posiciones de las hojas
  const sheetPositions = generateSheetPositions(config);
  const totalSheets = config.rows * config.cols;

  // Aplicar transformación a la imagen
  const applyTransform = useCallback(
    (scale: number, x: number, y: number) => {
      if (!fabricRef.current || !imageRef.current) return;

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

  // Crear lineas de division y labels (simplificado)
  const createGrid = useCallback(
    (canvas: Canvas) => {
      // Limpiar grid existente
      const existingGrid = canvas
        .getObjects()
        .filter((obj) => (obj as { data?: { isGrid?: boolean } }).data?.isGrid);
      existingGrid.forEach((item) => canvas.remove(item));

      if (!showGrid) return;

      const sheetWidth = canvasWidth / config.cols;
      const sheetHeight = canvasHeight / config.rows;

      // Lineas verticales - estilo más sutil
      for (let col = 1; col < config.cols; col++) {
        const x = col * sheetWidth;
        const line = new Line([x, 0, x, canvasHeight], {
          stroke: "rgba(255, 255, 255, 0.9)",
          strokeWidth: 3,
          selectable: false,
          evented: false,
        });
        (line as { data?: object }).data = { isGrid: true };
        canvas.add(line);

        // Línea de fondo para contraste
        const lineBg = new Line([x, 0, x, canvasHeight], {
          stroke: "rgba(0, 0, 0, 0.3)",
          strokeWidth: 5,
          selectable: false,
          evented: false,
        });
        (lineBg as { data?: object }).data = { isGrid: true };
        canvas.sendObjectToBack(lineBg);
        canvas.add(lineBg);
      }

      // Lineas horizontales
      for (let row = 1; row < config.rows; row++) {
        const y = row * sheetHeight;
        const line = new Line([0, y, canvasWidth, y], {
          stroke: "rgba(255, 255, 255, 0.9)",
          strokeWidth: 3,
          selectable: false,
          evented: false,
        });
        (line as { data?: object }).data = { isGrid: true };
        canvas.add(line);

        // Línea de fondo para contraste
        const lineBg = new Line([0, y, canvasWidth, y], {
          stroke: "rgba(0, 0, 0, 0.3)",
          strokeWidth: 5,
          selectable: false,
          evented: false,
        });
        (lineBg as { data?: object }).data = { isGrid: true };
        canvas.sendObjectToBack(lineBg);
        canvas.add(lineBg);
      }

      // Labels para cada hoja - más visibles y amigables
      if (showLabels) {
        sheetPositions.forEach((sheet, index) => {
          const x = sheet.x * canvasWidth + sheetWidth / 2;
          const y = sheet.y * canvasHeight + sheetHeight / 2;

          // Círculo de fondo
          const circleBg = new Rect({
            left: x - 20,
            top: y - 20,
            width: 40,
            height: 40,
            rx: 20,
            ry: 20,
            fill: "rgba(255, 255, 255, 0.9)",
            selectable: false,
            evented: false,
          });
          (circleBg as { data?: object }).data = { isGrid: true };
          canvas.add(circleBg);

          const label = new FabricText(`${index + 1}`, {
            left: x,
            top: y,
            fontSize: 20,
            fontFamily: "system-ui, sans-serif",
            fontWeight: "600",
            fill: "#1e293b",
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          });
          (label as { data?: object }).data = { isGrid: true };
          canvas.add(label);
        });
      }

      // Marco exterior con esquinas redondeadas visualmente
      const border = new Rect({
        left: 1,
        top: 1,
        width: canvasWidth - 2,
        height: canvasHeight - 2,
        fill: "transparent",
        stroke: "rgba(255, 255, 255, 0.8)",
        strokeWidth: 4,
        selectable: false,
        evented: false,
      });
      (border as { data?: object }).data = { isGrid: true };
      canvas.add(border);
    },
    [showGrid, showLabels, canvasWidth, canvasHeight, config, sheetPositions]
  );

  // Cargar imagen con auto-crop
  const loadImage = useCallback(
    async (canvas: Canvas) => {
      setIsLoading(true);

      try {
        // Detectar crop óptimo si está habilitado
        let cropResult = null;
        if (autoCrop) {
          const aspectRatio = canvasWidth / canvasHeight;
          cropResult = await detectOptimalCrop(imageUrl, {
            targetAspectRatio: aspectRatio,
            detectFaces: true,
          });
        }

        const img = await FabricImage.fromURL(imageUrl, {
          crossOrigin: "anonymous",
        });

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

        if (cropResult && cropResult.method !== "center") {
          // Usar el crop detectado
          const scaleX = canvasWidth / cropResult.width;
          const scaleY = canvasHeight / cropResult.height;
          scale = Math.max(scaleX, scaleY);

          // Centrar el crop
          left = -cropResult.x * scale + (canvasWidth - cropResult.width * scale) / 2;
          top = -cropResult.y * scale + (canvasHeight - cropResult.height * scale) / 2;
        } else {
          // Escalar para llenar el canvas
          const scaleX = canvasWidth / imgWidth;
          const scaleY = canvasHeight / imgHeight;
          scale = Math.max(scaleX, scaleY);
          left = (canvasWidth - imgWidth * scale) / 2;
          top = (canvasHeight - imgHeight * scale) / 2;
        }

        img.set({
          left,
          top,
          scaleX: scale,
          scaleY: scale,
          originX: "left",
          originY: "top",
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          // Controles táctiles mejorados
          cornerSize: TOUCH_CORNER_SIZE,
          touchCornerSize: TOUCH_CORNER_SIZE,
          cornerColor: "#0ea5e9",
          cornerStrokeColor: "#ffffff",
          cornerStyle: "circle",
          transparentCorners: false,
          borderColor: "#0ea5e9",
          borderScaleFactor: 2,
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

        // Crear grid encima
        createGrid(canvas);

        canvas.setActiveObject(img);
        canvas.renderAll();
        setIsLoading(false);

        onImageChange?.({ scale, x: left, y: top });
      } catch (error) {
        console.error("Error loading poster image:", error);
        setIsLoading(false);
      }
    },
    [imageUrl, autoCrop, canvasWidth, canvasHeight, createGrid, onImageChange]
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
      allowTouchScrolling: false,
    });

    fabricRef.current = canvas;
    onCanvasReady?.(canvas);

    // Eventos de transformación
    canvas.on("object:modified", (e) => {
      if (e.target === imageRef.current) {
        hapticFeedback("light");
        onImageChange?.({
          scale: e.target.scaleX || 1,
          x: e.target.left || 0,
          y: e.target.top || 0,
        });
        gestureStateRef.current = {
          initialScale: e.target.scaleX || 1,
          initialX: e.target.left || 0,
          initialY: e.target.top || 0,
        };
      }
    });

    canvas.on("object:scaling", () => setIsGesturing(true));
    canvas.on("object:moving", () => setIsGesturing(true));
    canvas.on("mouse:up", () => setIsGesturing(false));

    // Cargar imagen inicial
    loadImage(canvas);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  // Recargar cuando cambie la imagen o config
  useEffect(() => {
    if (fabricRef.current) {
      loadImage(fabricRef.current);
    }
  }, [imageUrl, config, loadImage]);

  // Actualizar grid
  useEffect(() => {
    if (fabricRef.current) {
      createGrid(fabricRef.current);
      fabricRef.current.renderAll();
    }
  }, [showGrid, showLabels, createGrid]);

  // Gestos de pinch-to-zoom
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
        const newScale = startScale * scale;

        const canvasEl = canvasRef.current;
        if (canvasEl) {
          const canvasRect = canvasEl.getBoundingClientRect();
          const centerX = ox - canvasRect.left;
          const centerY = oy - canvasRect.top;

          const scaleChange = newScale / startScale;
          const newX = centerX - (centerX - startX) * scaleChange;
          const newY = centerY - (centerY - startY) * scaleChange;

          applyTransform(newScale, newX, newY);
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
        if (!fabricRef.current || !imageRef.current) return;

        hapticFeedback("medium");

        const imgWidth = imageRef.current.width || 1;
        const imgHeight = imageRef.current.height || 1;
        const currentScale = imageRef.current.scaleX || 1;

        const fillScale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const fitScale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

        const tolerance = 0.05;
        let newScale: number;
        let newX: number;
        let newY: number;

        if (Math.abs(currentScale - fillScale) < tolerance * fillScale) {
          newScale = fitScale;
          newX = (canvasWidth - imgWidth * fitScale) / 2;
          newY = (canvasHeight - imgHeight * fitScale) / 2;
        } else {
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
    <div className={cn("relative", className)}>
      {/* Info del poster */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <GridIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {config.rows} x {config.cols} hojas
            </p>
            <p className="text-sm text-gray-500">
              {totalSheets} impresiones de {sizeName}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSheetPreview(!showSheetPreview)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            showSheetPreview
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {showSheetPreview ? "Ver completo" : "Ver hojas"}
        </button>
      </motion.div>

      {/* Canvas container */}
      <div ref={containerRef} className="relative touch-none">
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

            {/* Indicador de interacción */}
            <AnimatePresence>
              {isGesturing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div className="absolute inset-0 border-4 border-amber-400 rounded-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <span className="text-sm text-gray-600 font-medium">
                Preparando poster...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview de hojas individuales */}
      <AnimatePresence>
        {showSheetPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <p className="text-sm text-gray-500 mb-2">
              Asi se veran tus {totalSheets} hojas:
            </p>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
              }}
            >
              {sheetPositions.map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative aspect-[3/4] rounded-lg bg-gray-200 border-2 border-white shadow-sm overflow-hidden"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {index + 1}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instrucción táctil */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <MoveIcon className="w-4 h-4" />
          Arrastra para ajustar la posicion
        </p>
        <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
          <ZoomInIcon className="w-3 h-3" />
          Pellizca para zoom, doble toque para ajustar
        </p>
      </div>
    </div>
  );
}
