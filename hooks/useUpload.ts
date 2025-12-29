"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface UploadedImage {
  id: string;
  file: File;
  originalName: string;
  storagePath: string;
  publicUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  error?: string;
}

interface UseUploadOptions {
  bucket?: string;
  maxSizeMB?: number;
  generateThumbnail?: boolean;
  onProgress?: (progress: UploadProgress[]) => void;
  onComplete?: (images: UploadedImage[]) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const {
    bucket = "originals",
    maxSizeMB = 10,
    generateThumbnail = true,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const supabase = createClient();

  // Obtener dimensiones de imagen
  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Error al cargar imagen"));
        };
        img.src = url;
      });
    },
    []
  );

  // Generar thumbnail en cliente
  const createThumbnail = useCallback(
    async (file: File, maxSize: number = 200): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          URL.revokeObjectURL(url);

          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Calcular dimensiones manteniendo aspect ratio
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo crear contexto canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Error al crear thumbnail"));
              }
            },
            "image/jpeg",
            0.8
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Error al cargar imagen para thumbnail"));
        };

        img.src = url;
      });
    },
    []
  );

  // Actualizar progreso
  const updateProgress = useCallback(
    (id: string, updates: Partial<UploadProgress>) => {
      setProgress((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        onProgress?.(updated);
        return updated;
      });
    },
    [onProgress]
  );

  // Subir un archivo
  const uploadFile = useCallback(
    async (file: File, sessionId: string): Promise<UploadedImage | null> => {
      const id = uuidv4();
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${sessionId}/${id}.${fileExt}`;

      // Iniciar progreso
      const progressItem: UploadProgress = {
        id,
        fileName: file.name,
        progress: 0,
        status: "uploading",
      };

      setProgress((prev) => [...prev, progressItem]);

      try {
        // Validar tamano
        if (file.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`Archivo muy grande. Maximo ${maxSizeMB}MB`);
        }

        // Obtener dimensiones
        updateProgress(id, { progress: 10, status: "processing" });
        const dimensions = await getImageDimensions(file);

        // Subir imagen original
        updateProgress(id, { progress: 30 });
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error al subir: ${uploadError.message}`);
        }

        updateProgress(id, { progress: 60 });

        // Obtener URL publica
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        let thumbnailUrl: string | undefined;

        // Generar y subir thumbnail
        if (generateThumbnail) {
          updateProgress(id, { progress: 70 });
          try {
            const thumbnailBlob = await createThumbnail(file);
            const thumbnailPath = `${sessionId}/thumbnails/${id}.jpg`;

            await supabase.storage
              .from(bucket)
              .upload(thumbnailPath, thumbnailBlob, {
                cacheControl: "3600",
                upsert: false,
              });

            const { data: thumbUrlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(thumbnailPath);

            thumbnailUrl = thumbUrlData.publicUrl;
          } catch {
            // Si falla el thumbnail, no es critico
            console.warn("No se pudo crear thumbnail");
          }
        }

        updateProgress(id, { progress: 100, status: "done" });

        const uploadedImage: UploadedImage = {
          id,
          file,
          originalName: file.name,
          storagePath: fileName,
          publicUrl: urlData.publicUrl,
          thumbnailUrl,
          width: dimensions.width,
          height: dimensions.height,
          size: file.size,
          mimeType: file.type,
        };

        return uploadedImage;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        updateProgress(id, { status: "error", error: errorMessage });
        return null;
      }
    },
    [
      bucket,
      maxSizeMB,
      generateThumbnail,
      supabase,
      getImageDimensions,
      createThumbnail,
      updateProgress,
    ]
  );

  // Subir multiples archivos
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadedImage[]> => {
      setIsUploading(true);
      setProgress([]);

      // Generar session ID unico para este batch
      const sessionId = uuidv4();

      // Guardar session ID en localStorage para recuperar pedido
      if (typeof window !== "undefined") {
        localStorage.setItem("currentSessionId", sessionId);
      }

      try {
        const results = await Promise.all(
          files.map((file) => uploadFile(file, sessionId))
        );

        const successfulUploads = results.filter(
          (r): r is UploadedImage => r !== null
        );

        setUploadedImages((prev) => [...prev, ...successfulUploads]);
        onComplete?.(successfulUploads);

        return successfulUploads;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Error al subir");
        onError?.(err);
        return [];
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, onComplete, onError]
  );

  // Eliminar imagen subida
  const removeImage = useCallback(
    async (imageId: string) => {
      const image = uploadedImages.find((img) => img.id === imageId);
      if (!image) return;

      try {
        // Eliminar de storage
        await supabase.storage.from(bucket).remove([image.storagePath]);

        // Si tiene thumbnail, eliminarlo tambien
        if (image.thumbnailUrl) {
          const thumbPath = image.storagePath.replace(
            `/${image.id}.`,
            `/thumbnails/${image.id}.`
          );
          await supabase.storage.from(bucket).remove([thumbPath]);
        }

        // Actualizar estado local
        setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
        setProgress((prev) => prev.filter((p) => p.id !== imageId));
      } catch (error) {
        console.error("Error al eliminar imagen:", error);
      }
    },
    [bucket, supabase, uploadedImages]
  );

  // Limpiar todo
  const clearAll = useCallback(() => {
    setUploadedImages([]);
    setProgress([]);
  }, []);

  return {
    uploadFiles,
    removeImage,
    clearAll,
    isUploading,
    progress,
    uploadedImages,
  };
}
