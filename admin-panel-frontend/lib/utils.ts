import { type ClassValue, clsx } from "clsx";
import { useFormatter } from "next-intl";
import { twMerge } from "tailwind-merge";
import { DateTimeFormatOptions, useTimeZone } from "use-intl";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FormatDate(
  date: string,
  style: string | DateTimeFormatOptions | undefined = {
    dateStyle: "long",
  } as DateTimeFormatOptions
) {
  const format = useFormatter();
  return date && format.dateTime(convertTimeToUTC(date), style);
}
export function FormatDateTime(
  date: string,
  style: string | DateTimeFormatOptions | undefined = {
    dateStyle: "medium",
    timeStyle: "short",
  } as DateTimeFormatOptions
) {
  const format = useFormatter();
  return date && format.dateTime(convertTimeToUTC(date), style);
}
// changes time to utc
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

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || "downloaded_file";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
