import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import HttpError from "./HttpError";

export interface ErrorHandlerOptions {
  /**
   * Custom title for the error toast
   * If not provided, uses default from translations
   */
  title?: string;
  /**
   * Custom description for the error toast
   * If not provided, extracts from error message
   */
  description?: string;
  /**
   * Fallback message if error message cannot be extracted
   * @default "An unexpected error occurred"
   */
  fallbackMessage?: string;
  /**
   * Whether to prevent duplicate toasts for the same error
   * @default true
   */
  preventDuplicates?: boolean;
  /**
   * Custom error code mapping
   * Maps error codes to user-friendly messages
   */
  errorCodeMap?: Record<string | number, string>;
}

/**
 * Unified error handler hook for API errors.
 *
 * Normalizes error messages, displays consistent toast notifications,
 * and prevents duplicate error toasts.
 *
 * @example
 * const handleError = useApiErrorHandler();
 *
 * // In mutation
 * onError: (error) => handleError(error)
 *
 * @example
 * // With custom options
 * const handleError = useApiErrorHandler({
 *   title: "Custom Error Title",
 *   fallbackMessage: "Something went wrong"
 * });
 */
export default function useApiErrorHandler(options: ErrorHandlerOptions = {}) {
  const t = useTranslations("errors");
  const {
    title: customTitle,
    description: customDescription,
    fallbackMessage,
    preventDuplicates = true,
    errorCodeMap = {},
  } = options;

  // Track recent errors to prevent duplicates
  const recentErrors = useRef<Map<string, number>>(new Map());
  const DUPLICATE_WINDOW_MS = 2000; // 2 seconds

  const normalizeError = useCallback(
    (
      error: unknown
    ): { message: string; status?: number; code?: string | number } => {
      // Handle HttpError
      if (error instanceof HttpError) {
        const errorBody = error.body as Record<string, unknown> | null;
        const errorCode = (error.status || errorBody?.code) as
          | string
          | number
          | undefined;
        const errorMessage =
          (typeof errorBody?.message === "string" ? errorBody.message : null) ||
          (typeof errorBody?.error === "string" ? errorBody.error : null) ||
          error.message ||
          fallbackMessage ||
          t("wentWrong");

        const codeKey = errorCode ? String(errorCode) : undefined;
        const mappedMessage =
          codeKey && errorCodeMap[codeKey]
            ? typeof errorCodeMap[codeKey] === "string"
              ? errorCodeMap[codeKey]
              : null
            : null;

        const finalMessage =
          mappedMessage ||
          (typeof errorMessage === "string" ? errorMessage : t("wentWrong"));
        const finalCode: string | number | undefined = errorCode
          ? typeof errorCode === "string" || typeof errorCode === "number"
            ? errorCode
            : undefined
          : undefined;

        return {
          message: finalMessage,
          status: error.status,
          code: finalCode,
        };
      }

      // Handle standard Error
      if (error instanceof Error) {
        return {
          message: error.message || fallbackMessage || t("wentWrong"),
        };
      }

      // Handle string errors
      if (typeof error === "string") {
        return {
          message: error || fallbackMessage || t("wentWrong"),
        };
      }

      // Handle objects with message property
      if (error && typeof error === "object" && "message" in error) {
        const messageValue = error.message;
        const messageString =
          typeof messageValue === "string"
            ? messageValue
            : fallbackMessage || t("wentWrong");
        return {
          message: messageString,
        };
      }

      // Fallback
      return {
        message: fallbackMessage || t("wentWrong"),
      };
    },
    [t, fallbackMessage, errorCodeMap]
  );

  const handleError = useCallback(
    (error: unknown) => {
      const normalized = normalizeError(error);

      // Create a key for duplicate detection
      const errorKey = `${normalized.status || ""}-${normalized.code || ""}-${normalized.message}`;

      // Check for duplicates if enabled
      if (preventDuplicates) {
        const now = Date.now();
        const lastShown = recentErrors.current.get(errorKey);

        if (lastShown && now - lastShown < DUPLICATE_WINDOW_MS) {
          // Skip duplicate error
          return;
        }

        // Update recent errors map
        recentErrors.current.set(errorKey, now);

        // Clean up old entries (keep map size reasonable)
        if (recentErrors.current.size > 50) {
          const entries = Array.from(recentErrors.current.entries());
          const cutoff = now - DUPLICATE_WINDOW_MS;
          recentErrors.current.clear();
          entries.forEach(([key, timestamp]) => {
            if (timestamp > cutoff) {
              recentErrors.current.set(key, timestamp);
            }
          });
        }
      }

      // Show toast notification
      toast({
        title: customTitle || t("wentWrong"),
        description: customDescription || normalized.message,
        variant: "destructive",
      });
    },
    [normalizeError, preventDuplicates, customTitle, customDescription, t]
  );

  return handleError;
}
