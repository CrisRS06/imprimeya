"use client";

import { useState, useEffect, useCallback } from "react";

interface UseOnlineReturn {
  isOnline: boolean;
  wasOffline: boolean;
  clearOfflineFlag: () => void;
}

/**
 * Hook to detect online/offline status
 * Returns current status and whether user was recently offline
 */
export function useOnline(): UseOnlineReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Keep wasOffline true so UI can show "back online" message
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clearOfflineFlag = useCallback(() => {
    setWasOffline(false);
  }, []);

  return { isOnline, wasOffline, clearOfflineFlag };
}

export default useOnline;
