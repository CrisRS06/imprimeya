"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const EVENTS = ["mousedown", "touchstart", "keydown", "scroll"] as const;

/**
 * Monitors user activity and resets the app after prolonged inactivity.
 * Designed for shared kiosk devices where the next customer shouldn't
 * see the previous customer's session.
 */
export function useIdleTimeout(
  onTimeout: () => void,
  timeoutMs: number = IDLE_TIMEOUT_MS
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onTimeout();
      router.push("/");
    }, timeoutMs);
  }, [onTimeout, timeoutMs, router]);

  useEffect(() => {
    // Start timer
    resetTimer();

    // Reset on any user activity
    const handler = () => resetTimer();
    for (const event of EVENTS) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of EVENTS) {
        window.removeEventListener(event, handler);
      }
    };
  }, [resetTimer]);
}
