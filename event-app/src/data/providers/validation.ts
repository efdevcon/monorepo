import APP_CONFIG from "@/CONFIG";
import { toast } from "sonner";

/**
 * Wrap a validation call - catches errors, toasts them, then re-throws
 * If validation is disabled, returns data as-is without running the parse
 */
export function validateWithToast<T>(
  fn: () => T,
  data: unknown,
  context?: string
): T {
  if (!APP_CONFIG.RUNTIME_VALIDATION) {
    return data as T;
  }

  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = context
      ? `RUNTIME_VALIDATION ERROR [${context}]: ${message}`
      : `RUNTIME_VALIDATION ERROR: ${message}`;

    // toast.error(fullMessage, { duration: 5 });

    // console.error(fullMessage, error);

    throw { message: fullMessage };
  }
}
