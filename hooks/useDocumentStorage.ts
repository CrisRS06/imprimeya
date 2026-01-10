"use client";

import { useState, useCallback } from "react";
import { getDocumentDb, StoredDocument } from "@/lib/db/documentDb";

// Duración de expiración: 24 horas
const EXPIRATION_HOURS = 24;

/**
 * Hook para almacenar y recuperar documentos PDF en IndexedDB
 * Soporta archivos de hasta 50MB+ sin las limitaciones de sessionStorage
 */
export function useDocumentStorage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Guarda un documento PDF en IndexedDB
   * @param file - Archivo PDF
   * @param pageCount - Número de páginas del PDF
   * @returns ID del documento guardado
   */
  const saveDocument = useCallback(
    async (file: File, pageCount: number): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const db = getDocumentDb();

        // Verificar espacio disponible (si el navegador lo soporta)
        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate();
          const available = (estimate.quota || 0) - (estimate.usage || 0);

          if (file.size > available) {
            throw new Error(
              "No hay suficiente espacio de almacenamiento en el dispositivo"
            );
          }
        }

        // Leer archivo como ArrayBuffer (sin conversión a base64)
        const arrayBuffer = await file.arrayBuffer();

        // Generar ID único
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Calcular fecha de expiración
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + EXPIRATION_HOURS);

        // Guardar en IndexedDB
        await db.documents.add({
          id,
          name: file.name,
          pdfData: arrayBuffer,
          size: file.size,
          pageCount,
          selectedPages: [],
          createdAt: new Date(),
          expiresAt,
        });

        return id;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al guardar documento";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene un documento de IndexedDB
   * @param docId - ID del documento
   * @returns Documento almacenado
   */
  const getDocument = useCallback(
    async (docId: string): Promise<StoredDocument> => {
      setIsLoading(true);
      setError(null);

      try {
        const db = getDocumentDb();
        const doc = await db.documents.get(docId);

        if (!doc) {
          throw new Error("Documento no encontrado");
        }

        // Verificar expiración
        if (new Date() > doc.expiresAt) {
          await db.documents.delete(docId);
          throw new Error(
            "El documento ha expirado. Por favor vuelve a subirlo."
          );
        }

        return doc;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al obtener documento";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Actualiza un documento en IndexedDB
   * @param docId - ID del documento
   * @param updates - Campos a actualizar
   */
  const updateDocument = useCallback(
    async (
      docId: string,
      updates: Partial<Omit<StoredDocument, "id">>
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const db = getDocumentDb();
        await db.documents.update(docId, updates);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al actualizar documento";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Elimina un documento de IndexedDB
   * @param docId - ID del documento
   */
  const deleteDocument = useCallback(async (docId: string): Promise<void> => {
    try {
      const db = getDocumentDb();
      await db.documents.delete(docId);
    } catch (err) {
      console.error("Error al eliminar documento:", err);
    }
  }, []);

  /**
   * Limpia documentos expirados de IndexedDB
   * Se recomienda llamar al iniciar la app
   */
  const cleanupExpired = useCallback(async (): Promise<number> => {
    try {
      const db = getDocumentDb();
      const now = new Date();

      // Obtener todos los documentos y filtrar expirados
      const allDocs = await db.documents.toArray();
      const expiredIds = allDocs
        .filter((doc) => new Date(doc.expiresAt) < now)
        .map((doc) => doc.id);

      if (expiredIds.length > 0) {
        await db.documents.bulkDelete(expiredIds);
        console.log(`Limpiados ${expiredIds.length} documentos expirados`);
      }

      return expiredIds.length;
    } catch (err) {
      console.error("Error al limpiar documentos expirados:", err);
      return 0;
    }
  }, []);

  return {
    saveDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    cleanupExpired,
    isLoading,
    error,
  };
}
