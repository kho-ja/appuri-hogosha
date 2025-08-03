import { type ClassValue, clsx } from "clsx";
import { useFormatter, useTimeZone } from "next-intl";
import { twMerge } from "tailwind-merge";
import { DateTimeFormatOptions } from "use-intl";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to safely get formatter and timezone
function useSafeFormatter() {
  try {
    const format = useFormatter();
    const timeZone = useTimeZone();
    return { format, timeZone, isAvailable: true };
  } catch (error) {
    // Fallback for when context is not available
    return { format: null, timeZone: 'UTC', isAvailable: false };
  }
}

// MODERN APPROACH: Use next-intl's automatic timezone handling
export function FormatDate(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "long",
  }
) {
  const { format, timeZone, isAvailable } = useSafeFormatter();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  if (!isAvailable || !format) {
    // Fallback formatting when context is not available
    return dateObject.toLocaleDateString('en-US', {
      dateStyle: 'long' as any,
    });
  }

  // Let next-intl handle timezone conversion automatically
  return format.dateTime(dateObject, {
    ...style,
    timeZone, // Explicitly use the configured timezone
  });
}

export function FormatDateTime(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "medium",
    timeStyle: "short",
  }
) {
  const { format, timeZone, isAvailable } = useSafeFormatter();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  if (!isAvailable || !format) {
    // Fallback formatting when context is not available
    return dateObject.toLocaleDateString('en-US', {
      dateStyle: 'medium' as any,
      timeStyle: 'short' as any,
    });
  }

  // Let next-intl handle timezone conversion automatically
  return format.dateTime(dateObject, {
    ...style,
    timeZone, // Explicitly use the configured timezone
  });
}

// NEW: Specialized formatters for common use cases
export function FormatRelativeTime(date: string | Date) {
  const { format, isAvailable } = useSafeFormatter();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  if (!isAvailable || !format) {
    // Simple fallback
    return dateObject.toLocaleDateString();
  }

  return format.relativeTime(dateObject);
}

export function FormatTimeOnly(date: string | Date, use24Hour: boolean = true) {
  const { format, timeZone, isAvailable } = useSafeFormatter();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  if (!isAvailable || !format) {
    // Fallback formatting when context is not available
    return dateObject.toLocaleTimeString('en-US', {
      hour12: !use24Hour,
    });
  }

  return format.dateTime(dateObject, {
    timeStyle: "short",
    hour12: !use24Hour,
    timeZone,
  });
}

export function FormatDateOnly(date: string | Date) {
  const { format, timeZone, isAvailable } = useSafeFormatter();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  if (!isAvailable || !format) {
    // Fallback formatting when context is not available
    return dateObject.toLocaleDateString('en-US');
  }

  return format.dateTime(dateObject, {
    dateStyle: "medium",
    timeZone,
  });
}

// IMPROVED: Better display format for date picker
export function FormatDateTimeForDisplay(date: Date | null): string {
  const { format, timeZone, isAvailable } = useSafeFormatter();

  if (!date) return "";

  if (!isAvailable || !format) {
    // Fallback formatting when context is not available
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return format.dateTime(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

// Keep for backward compatibility but mark as deprecated
/** @deprecated Use FormatDateTime instead - this function doesn't respect user timezone */
export function convertTimeToUTC(date: string) {
  const serverDate = new Date(date);
  const hours = process.env.NEXT_PUBLIC_CALLIBRATE_HOURS ?? 0;
  serverDate.setHours(serverDate.getHours() + Number(hours));
  return serverDate;
}

export async function convertToUtf8IfNeeded(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const encoding = detectEncoding(arrayBuffer);

  if (encoding === 'UTF-8') {
    console.log("File is already in UTF-8 format. No conversion needed.");
    return new Blob([arrayBuffer], { type: 'text/plain;charset=utf-8' });
  }

  // If not UTF-8, convert from Shift-JIS (Japanese ANSI) to UTF-8
  const decoder = new TextDecoder('shift-jis');
  const decodedText = decoder.decode(arrayBuffer);
  const encoder = new TextEncoder();
  const utf8Array = encoder.encode(decodedText);

  console.log(`File converted from ${encoding} to UTF-8.`);
  return new Blob([utf8Array], { type: 'text/plain;charset=utf-8' });
}

export function detectEncoding(arrayBuffer: ArrayBuffer) {
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
  const shiftJISDecoder = new TextDecoder('shift-jis', { fatal: true });

  try {
    utf8Decoder.decode(arrayBuffer);
    return 'UTF-8';
  } catch (e) {
    try {
      shiftJISDecoder.decode(arrayBuffer);
      return 'Shift-JIS';
    } catch (e) {
      return 'Unknown';
    }
  }
}

export function download(bufferData: any, filename: string = "") {
  let buffer: Buffer;

  if (bufferData.type === "Buffer" && Array.isArray(bufferData.data)) {
    buffer = Buffer.from(bufferData.data);
  } else if (typeof bufferData === "string") {
    buffer = Buffer.from(bufferData);
  } else if (bufferData instanceof Buffer) {
    buffer = bufferData;
  } else {
    throw new Error("Unsupported data type for download");
  }

  const blob = new Blob([new Uint8Array(buffer)], { type: "application/octet-stream" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || "downloaded_file";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
