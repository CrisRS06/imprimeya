"use client";

import { useCallback, useEffect } from "react";
import type { PhotoWithQuantity } from "@/lib/types/photos";

// Re-export the type for convenience
export type { PhotoWithQuantity };

const PREFIX = "foto_";

const KEYS = {
  photos: `${PREFIX}uploadedPhotos`,
  sessionId: `${PREFIX}uploadSessionId`,
  layoutId: `${PREFIX}selectedLayoutId`,
  paper: `${PREFIX}selectedPaper`,
  sheets: `${PREFIX}sheetsCount`,
  fillMode: `${PREFIX}fillMode`,
  quantity: `${PREFIX}photoQuantity`,
  expiresAt: `${PREFIX}expiresAt`,
} as const;

const EXPIRATION_HOURS = 24;

export function usePhotoStorage() {
  // Migrate data from sessionStorage to localStorage on first use
  useEffect(() => {
    // Migrate uploadedPhotos
    const oldPhotos = sessionStorage.getItem("uploadedPhotos");
    if (oldPhotos && !localStorage.getItem(KEYS.photos)) {
      localStorage.setItem(KEYS.photos, oldPhotos);
      sessionStorage.removeItem("uploadedPhotos");
    }

    // Migrate uploadSessionId
    const oldSessionId = sessionStorage.getItem("uploadSessionId");
    if (oldSessionId && !localStorage.getItem(KEYS.sessionId)) {
      localStorage.setItem(KEYS.sessionId, oldSessionId);
      sessionStorage.removeItem("uploadSessionId");
    }

    // Migrate selectedLayoutId
    const oldLayoutId = sessionStorage.getItem("selectedLayoutId");
    if (oldLayoutId && !localStorage.getItem(KEYS.layoutId)) {
      localStorage.setItem(KEYS.layoutId, oldLayoutId);
      sessionStorage.removeItem("selectedLayoutId");
    }

    // Migrate selectedPaper
    const oldPaper = sessionStorage.getItem("selectedPaper");
    if (oldPaper && !localStorage.getItem(KEYS.paper)) {
      localStorage.setItem(KEYS.paper, oldPaper);
      sessionStorage.removeItem("selectedPaper");
    }

    // Migrate sheetsCount
    const oldSheets = sessionStorage.getItem("sheetsCount");
    if (oldSheets && !localStorage.getItem(KEYS.sheets)) {
      localStorage.setItem(KEYS.sheets, oldSheets);
      sessionStorage.removeItem("sheetsCount");
    }

    // Migrate fillMode
    const oldFillMode = sessionStorage.getItem("fillMode");
    if (oldFillMode && !localStorage.getItem(KEYS.fillMode)) {
      localStorage.setItem(KEYS.fillMode, oldFillMode);
      sessionStorage.removeItem("fillMode");
    }

    // Migrate photoQuantity
    const oldQuantity = sessionStorage.getItem("photoQuantity");
    if (oldQuantity && !localStorage.getItem(KEYS.quantity)) {
      localStorage.setItem(KEYS.quantity, oldQuantity);
      sessionStorage.removeItem("photoQuantity");
    }

    // Set expiration if we migrated any data
    if (localStorage.getItem(KEYS.photos) && !localStorage.getItem(KEYS.expiresAt)) {
      const exp = new Date();
      exp.setHours(exp.getHours() + EXPIRATION_HOURS);
      localStorage.setItem(KEYS.expiresAt, exp.toISOString());
    }
  }, []);

  const isExpired = useCallback((): boolean => {
    const exp = localStorage.getItem(KEYS.expiresAt);
    if (!exp) return true;
    return new Date() > new Date(exp);
  }, []);

  const refreshExpiration = useCallback(() => {
    const exp = new Date();
    exp.setHours(exp.getHours() + EXPIRATION_HOURS);
    localStorage.setItem(KEYS.expiresAt, exp.toISOString());
  }, []);

  const clearAll = useCallback(() => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    // Also clear any remaining legacy sessionStorage keys
    sessionStorage.removeItem("uploadedPhotos");
    sessionStorage.removeItem("uploadSessionId");
    sessionStorage.removeItem("selectedLayoutId");
    sessionStorage.removeItem("selectedPaper");
    sessionStorage.removeItem("sheetsCount");
    sessionStorage.removeItem("fillMode");
    sessionStorage.removeItem("photoQuantity");
    sessionStorage.removeItem("uploadedFiles");
    sessionStorage.removeItem("repeatMode");
  }, []);

  // Photos
  const savePhotos = useCallback(
    (photos: PhotoWithQuantity[]) => {
      localStorage.setItem(KEYS.photos, JSON.stringify(photos));
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getPhotos = useCallback((): PhotoWithQuantity[] | null => {
    if (isExpired()) {
      clearAll();
      return null;
    }
    const stored = localStorage.getItem(KEYS.photos);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(KEYS.photos);
      return null;
    }
  }, [isExpired, clearAll]);

  // Session ID
  const saveSessionId = useCallback(
    (id: string) => {
      localStorage.setItem(KEYS.sessionId, id);
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getSessionId = useCallback((): string | null => {
    if (isExpired()) return null;
    return localStorage.getItem(KEYS.sessionId);
  }, [isExpired]);

  // Layout
  const saveLayoutId = useCallback(
    (id: string) => {
      localStorage.setItem(KEYS.layoutId, id);
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getLayoutId = useCallback((): string | null => {
    if (isExpired()) return null;
    return localStorage.getItem(KEYS.layoutId);
  }, [isExpired]);

  // Paper
  const savePaper = useCallback(
    (paper: string) => {
      localStorage.setItem(KEYS.paper, paper);
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getPaper = useCallback((): string | null => {
    if (isExpired()) return null;
    return localStorage.getItem(KEYS.paper);
  }, [isExpired]);

  // Sheets
  const saveSheetsCount = useCallback(
    (count: number) => {
      localStorage.setItem(KEYS.sheets, count.toString());
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getSheetsCount = useCallback((): number | null => {
    if (isExpired()) return null;
    const s = localStorage.getItem(KEYS.sheets);
    return s ? parseInt(s, 10) : null;
  }, [isExpired]);

  // Fill mode
  const saveFillMode = useCallback(
    (mode: "fill" | "fit") => {
      localStorage.setItem(KEYS.fillMode, mode);
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getFillMode = useCallback((): "fill" | "fit" | null => {
    if (isExpired()) return null;
    const m = localStorage.getItem(KEYS.fillMode);
    return m === "fill" || m === "fit" ? m : null;
  }, [isExpired]);

  // Quantity
  const saveQuantity = useCallback(
    (qty: number) => {
      localStorage.setItem(KEYS.quantity, qty.toString());
      refreshExpiration();
    },
    [refreshExpiration]
  );

  const getQuantity = useCallback((): number | null => {
    if (isExpired()) return null;
    const q = localStorage.getItem(KEYS.quantity);
    return q ? parseInt(q, 10) : null;
  }, [isExpired]);

  return {
    savePhotos,
    getPhotos,
    saveSessionId,
    getSessionId,
    saveLayoutId,
    getLayoutId,
    savePaper,
    getPaper,
    saveSheetsCount,
    getSheetsCount,
    saveFillMode,
    getFillMode,
    saveQuantity,
    getQuantity,
    clearAll,
    isExpired,
  };
}
