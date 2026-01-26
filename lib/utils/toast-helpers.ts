/**
 * Helper functions for displaying contextual error toasts with retry functionality
 */

import { toast } from "sonner";
import { getErrorConfig } from "./error-messages";

export interface ShowErrorToastOptions {
  error: Error | string;
  onRetry?: () => void;
}

/**
 * Shows an error toast with contextual messaging and optional retry button
 * @param options - Error and optional retry callback
 */
export function showErrorToast({ error, onRetry }: ShowErrorToastOptions) {
  const config = getErrorConfig(error);

  toast.error(config.title, {
    description: config.description,
    duration: config.duration,
    action:
      config.actionLabel && onRetry
        ? {
            label: config.actionLabel,
            onClick: onRetry,
          }
        : undefined,
  });
}

/**
 * Shows a simple error toast without retry functionality
 * @param message - The error message to display
 */
export function showSimpleError(message: string) {
  const config = getErrorConfig(message);

  toast.error(config.title, {
    description: config.description,
    duration: config.duration,
  });
}
