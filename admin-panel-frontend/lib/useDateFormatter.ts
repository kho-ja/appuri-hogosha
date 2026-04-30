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

// O'zbek tilidagi "M04" xatolarini ushlab to'g'rilash 
const fixUzbekMonths = (formattedStr: string): string => {
  let result = formattedStr;

  
  if (result.includes("M0") || result.includes("M1")) {
    const monthMap: Record<string, string> = {
      M01: "Yanvar", M02: "Fevral", M03: "Mart", M04: "Aprel",
      M05: "May", M06: "Iyun", M07: "Iyul", M08: "Avgust",
      M09: "Sentabr", M10: "Oktabr", M11: "Noyabr", M12: "Dekabr",
    };
    result = result.replace(/M(0[1-9]|1[0-2])/g, (match) => monthMap[match] || match);
  }

  
  const wrongOrderRegex = /(\d{4})\s+([a-zA-Z]+)\s+(\d{1,2})/;
  if (wrongOrderRegex.test(result)) {
    result = result.replace(wrongOrderRegex, "$3 $2, $1");
  }

  return result;
};

/**
 * Unified date and time formatting hook.
 *
 * Centralizes all date/time formatting logic with consistent timezone handling.
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

      return fixUzbekMonths(
        format.dateTime(dateObject, {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone,
        })
      );
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

      return fixUzbekMonths(
        format.dateTime(dateObject, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone,
          ...customOptions,
        })
      );
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

      return fixUzbekMonths(
        format.dateTime(dateObject, {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone,
        })
      );
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