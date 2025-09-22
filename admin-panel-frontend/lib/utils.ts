import { type ClassValue, clsx } from "clsx";
import { useFormatter, useTimeZone } from "next-intl";
import { twMerge } from "tailwind-merge";
import { DateTimeFormatOptions } from "use-intl";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// MODERN APPROACH: Use next-intl's automatic timezone handling
export function FormatDate(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "long",
  }
) {
  const format = useFormatter();
  const timeZone = useTimeZone();

  if (!date) return "";

  const dateObject = typeof date === "string" ? new Date(date) : date;

  return format.dateTime(dateObject, {
    ...style,
    timeZone,
  });
}

export function FormatDateTime(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "medium",
    timeStyle: "short",
  }
) {
  const format = useFormatter();
  const timeZone = useTimeZone();

  if (!date) return "";

  const dateObject = typeof date === "string" ? new Date(date) : date;

  return format.dateTime(dateObject, {
    ...style,
    timeZone,
  });
}

export function FormatRelativeTime(date: string | Date) {
  const format = useFormatter();

  if (!date) return "";

  const dateObject = typeof date === "string" ? new Date(date) : date;

  return format.relativeTime(dateObject);
}

export function FormatTimeOnly(date: string | Date, use24Hour: boolean = true) {
  const format = useFormatter();
  const timeZone = useTimeZone();

  if (!date) return "";

  const dateObject = typeof date === "string" ? new Date(date) : date;

  return format.dateTime(dateObject, {
    timeStyle: "short",
    hour12: !use24Hour,
    timeZone,
  });
}

export function FormatDateOnly(date: string | Date) {
  const format = useFormatter();
  const timeZone = useTimeZone();

  if (!date) return "";

  const dateObject = typeof date === "string" ? new Date(date) : date;

  return format.dateTime(dateObject, {
    dateStyle: "medium",
    timeZone,
  });
}

// IMPROVED: Better display format for date picker
export function FormatDateTimeForDisplay(date: Date | null): string {
  const format = useFormatter();
  const timeZone = useTimeZone();

  if (!date) return "";

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

  if (encoding === "UTF-8") {
    console.log("File is already in UTF-8 format. No conversion needed.");
    return new Blob([arrayBuffer], { type: "text/plain;charset=utf-8" });
  }

  // If not UTF-8, convert from Shift-JIS (Japanese ANSI) to UTF-8
  const decoder = new TextDecoder("shift-jis");
  const decodedText = decoder.decode(arrayBuffer);
  const encoder = new TextEncoder();
  const utf8Array = encoder.encode(decodedText);

  console.log(`File converted from ${encoding} to UTF-8.`);
  return new Blob([utf8Array], { type: "text/plain;charset=utf-8" });
}

export function detectEncoding(arrayBuffer: ArrayBuffer) {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
  const shiftJISDecoder = new TextDecoder("shift-jis", { fatal: true });

  try {
    utf8Decoder.decode(arrayBuffer);
    return "UTF-8";
  } catch (e) {
    try {
      shiftJISDecoder.decode(arrayBuffer);
      return "Shift-JIS";
    } catch (e) {
      return "Unknown";
    }
  }
}

export function download(bufferData: unknown, filename: string = "") {
  let buffer: Buffer;

  if (
    typeof bufferData === "object" &&
    bufferData !== null &&
    (bufferData as { type?: string }).type === "Buffer" &&
    Array.isArray((bufferData as { data?: unknown }).data)
  ) {
    buffer = Buffer.from((bufferData as { data: number[] }).data);
  } else if (typeof bufferData === "string") {
    buffer = Buffer.from(bufferData);
  } else if (bufferData instanceof Buffer) {
    buffer = bufferData;
  } else {
    throw new Error("Unsupported data type for download");
  }

  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/octet-stream",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || "downloaded_file";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
