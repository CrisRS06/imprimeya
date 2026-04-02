"use client";

import { useOrder } from "@/lib/context/OrderContext";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

/**
 * Monitors user inactivity and resets the entire app state after 30 minutes.
 * Must be placed inside OrderProvider to access resetOrder.
 */
export function IdleTimeoutGuard({ children }: { children: React.ReactNode }) {
  const { resetOrder } = useOrder();

  useIdleTimeout(resetOrder);

  return <>{children}</>;
}
