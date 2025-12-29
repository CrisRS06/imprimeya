"use client";

import { useCallback, useRef, useEffect } from "react";
import { useGesture } from "@use-gesture/react";
import type { Canvas, FabricImage } from "fabric";

export interface GestureState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
}

export interface UseCanvasGesturesOptions {
  canvas: Canvas | null;
  image: FabricImage | null;
  minScale?: number;
  maxScale?: number;
  onGestureStart?: () => void;
  onGestureEnd?: (state: GestureState) => void;
  onDoubleTap?: () => void;
  enabled?: boolean;
}

export interface UseCanvasGesturesReturn {
  bind: ReturnType<typeof useGesture>;
  resetPosition: () => void;
  toggleFillFit: () => void;
  currentState: GestureState;
}

/**
 * Hook para manejar gestos tactiles en un canvas de Fabric.js
 * - Pinch: zoom in/out
 * - Pan: mover imagen
 * - Double-tap: reset o toggle fill/fit
 */
export function useCanvasGestures(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseCanvasGesturesOptions
): UseCanvasGesturesReturn {
  const {
    canvas,
    image,
    minScale = 0.5,
    maxScale = 3,
    onGestureStart,
    onGestureEnd,
    onDoubleTap,
    enabled = true,
  } = options;

  const stateRef = useRef<GestureState>({
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
  });

  const initialStateRef = useRef<GestureState | null>(null);
  const lastTapRef = useRef<number>(0);

  // Guardar estado inicial cuando la imagen se carga
  useEffect(() => {
    if (image && !initialStateRef.current) {
      initialStateRef.current = {
        scale: image.scaleX || 1,
        x: image.left || 0,
        y: image.top || 0,
        rotation: image.angle || 0,
      };
      stateRef.current = { ...initialStateRef.current };
    }
  }, [image]);

  // Aplicar transformacion a la imagen
  const applyTransform = useCallback(
    (state: Partial<GestureState>) => {
      if (!canvas || !image) return;

      const newState = { ...stateRef.current, ...state };

      // Limitar escala
      newState.scale = Math.max(minScale, Math.min(maxScale, newState.scale));

      image.set({
        scaleX: newState.scale,
        scaleY: newState.scale,
        left: newState.x,
        top: newState.y,
        angle: newState.rotation,
      });

      image.setCoords();
      canvas.requestRenderAll();
      stateRef.current = newState;
    },
    [canvas, image, minScale, maxScale]
  );

  // Reset a posicion inicial
  const resetPosition = useCallback(() => {
    if (initialStateRef.current) {
      applyTransform(initialStateRef.current);
    }
  }, [applyTransform]);

  // Toggle entre fill y fit
  const toggleFillFit = useCallback(() => {
    if (!canvas || !image) return;

    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;
    const imgWidth = image.width || 1;
    const imgHeight = image.height || 1;

    const currentScale = stateRef.current.scale;
    const fillScale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const fitScale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

    // Si esta cerca de fill, cambiar a fit, y viceversa
    const tolerance = 0.1;
    const newScale = Math.abs(currentScale - fillScale) < tolerance ? fitScale : fillScale;

    applyTransform({
      scale: newScale,
      x: (canvasWidth - imgWidth * newScale) / 2,
      y: (canvasHeight - imgHeight * newScale) / 2,
    });
  }, [canvas, image, applyTransform]);

  // Configurar gestos
  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], first, last }) => {
        if (!enabled || !canvas || !image) return;

        if (first) {
          onGestureStart?.();
        }

        applyTransform({
          x: (initialStateRef.current?.x || 0) + mx,
          y: (initialStateRef.current?.y || 0) + my,
        });

        if (last) {
          // Actualizar estado inicial para el proximo drag
          initialStateRef.current = { ...stateRef.current };
          onGestureEnd?.(stateRef.current);
        }
      },

      onPinch: ({ offset: [scale], origin: [ox, oy], first, last }) => {
        if (!enabled || !canvas || !image) return;

        if (first) {
          onGestureStart?.();
        }

        // Calcular nuevo centro basado en el origen del pinch
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const centerX = ox - rect.left;
          const centerY = oy - rect.top;

          // Ajustar posicion para mantener el punto focal
          const prevScale = stateRef.current.scale;
          const newScale = Math.max(minScale, Math.min(maxScale, scale));
          const scaleChange = newScale / prevScale;

          const newX = centerX - (centerX - stateRef.current.x) * scaleChange;
          const newY = centerY - (centerY - stateRef.current.y) * scaleChange;

          applyTransform({ scale: newScale, x: newX, y: newY });
        } else {
          applyTransform({ scale });
        }

        if (last) {
          initialStateRef.current = { ...stateRef.current };
          onGestureEnd?.(stateRef.current);
        }
      },

      onDoubleClick: () => {
        if (!enabled) return;
        onDoubleTap?.();
        toggleFillFit();
      },
    },
    {
      target: containerRef,
      drag: {
        enabled,
        filterTaps: true,
        pointer: { touch: true },
      },
      pinch: {
        enabled,
        scaleBounds: { min: minScale, max: maxScale },
        rubberband: true,
      },
    }
  );

  return {
    bind,
    resetPosition,
    toggleFillFit,
    currentState: stateRef.current,
  };
}

/**
 * Utilidad para haptic feedback
 */
export function hapticFeedback(type: "light" | "medium" | "success" = "light") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    const patterns: Record<typeof type, number | number[]> = {
      light: 10,
      medium: 25,
      success: [10, 50, 10],
    };
    navigator.vibrate(patterns[type]);
  }
}
