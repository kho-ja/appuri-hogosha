import { useFormatter, useTimeZone } from "next-intl";
import { useCallback } from "react";
import { DateTimeFormatOptions } from "use-intl";

export type DateFormatType =
  | "date"
  | "time"
  | "datetime"
  | "relative"
  | "dateOnly"
  | "timeOnly";

export interface UseDateFormatterOptions {
  /**
   * Default timezone to use for formatting
   * If not provided, uses the user's timezone from next-intl
   */
  timeZone?: string;
  /**
   * Whether to use 24-hour format for time
   * @default true
   */
  use24Hour?: boolean;
}

export interface UseDateFormatterReturn {
  /**
   * Format a date/time value
   * @param date - Date string or Date object
   * @param format - Format type: "date", "time", "datetime", "relative", "dateOnly", "timeOnly"
   * @param options - Optional custom formatting options
   */
  format: (
    date: string | Date | null | undefined,
    format?: DateFormatType,
    options?: DateTimeFormatOptions
  ) => string;

  /**
   * Format date only (long format)
   */
  formatDate: (date: string | Date | null | undefined) => string;

  /**
   * Format time only
   */
  formatTime: (
    date: string | Date | null | undefined,
    use24Hour?: boolean
  ) => string;

  /**
   * Format date and time together
   */
  formatDateTime: (
    date: string | Date | null | undefined,
    options?: DateTimeFormatOptions
  ) => string;

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelative: (date: string | Date | null | undefined) => string;

  /**
   * Format date only (medium format)
   */
  formatDateOnly: (date: string | Date | null | undefined) => string;
}

/**
 * Unified date and time formatting hook.
 *
 * Centralizes all date/time formatting logic with consistent timezone handling.
 *
 * @example
 * const { format, formatDate, formatTime, formatDateTime } = useDateFormatter();
 *
 * format(new Date(), "datetime")
 * formatDate(new Date())
 * formatTime(new Date(), true)
 * formatDateTime(new Date())
 *
 * @example
 * // With custom options
 * const { format } = useDateFormatter({ use24Hour: false });
 * format(new Date(), "datetime", { dateStyle: "full" })
 */
export default function useDateFormatter(
  options: UseDateFormatterOptions = {}
): UseDateFormatterReturn {
  const format = useFormatter();
  const defaultTimeZone = useTimeZone();
  const { timeZone = defaultTimeZone, use24Hour = true } = options;

  const formatDate = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      return format.dateTime(dateObject, {
        dateStyle: "long",
        timeZone,
      });
    },
    [format, timeZone]
  );

  const formatTime = useCallback(
    (
      date: string | Date | null | undefined,
      use24HourFormat: boolean = use24Hour
    ): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      return format.dateTime(dateObject, {
        timeStyle: "short",
        hour12: !use24HourFormat,
        timeZone,
      });
    },
    [format, timeZone, use24Hour]
  );

  const formatDateTime = useCallback(
    (
      date: string | Date | null | undefined,
      customOptions?: DateTimeFormatOptions
    ): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      return format.dateTime(dateObject, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
        ...customOptions,
      });
    },
    [format, timeZone]
  );

  const formatRelative = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      return format.relativeTime(dateObject);
    },
    [format]
  );

  const formatDateOnly = useCallback(
    (date: string | Date | null | undefined): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      return format.dateTime(dateObject, {
        dateStyle: "medium",
        timeZone,
      });
    },
    [format, timeZone]
  );

  const formatGeneric = useCallback(
    (
      date: string | Date | null | undefined,
      formatType: DateFormatType = "datetime",
      customOptions?: DateTimeFormatOptions
    ): string => {
      if (!date) return "";

      const dateObject = typeof date === "string" ? new Date(date) : date;

      switch (formatType) {
        case "date":
          return formatDate(dateObject);
        case "time":
          return formatTime(dateObject);
        case "datetime":
          return formatDateTime(dateObject, customOptions);
        case "relative":
          return formatRelative(dateObject);
        case "dateOnly":
          return formatDateOnly(dateObject);
        case "timeOnly":
          return formatTime(dateObject);
        default:
          return formatDateTime(dateObject, customOptions);
      }
    },
    [formatDate, formatTime, formatDateTime, formatRelative, formatDateOnly]
  );

  return {
    format: formatGeneric,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelative,
    formatDateOnly,
  };
}
