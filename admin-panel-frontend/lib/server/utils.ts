import { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTimeZone } from "next-intl/server";

export async function FormatDate(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "long",
  }
) {
  const format = await getFormatter();
  const timeZone = await getTimeZone();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  // Let next-intl handle timezone conversion automatically
  return format.dateTime(dateObject, {
    ...style,
    timeZone,
  });
}

export async function FormatDateTime(
  date: string | Date,
  style: DateTimeFormatOptions | undefined = {
    dateStyle: "medium",
    timeStyle: "short",
  }
) {
  const format = await getFormatter();
  const timeZone = await getTimeZone();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  // Let next-intl handle timezone conversion automatically
  return format.dateTime(dateObject, {
    ...style,
    timeZone,
  });
}

// NEW: Server-side specialized formatters
export async function FormatTimeOnly(date: string | Date, use24Hour: boolean = true) {
  const format = await getFormatter();
  const timeZone = await getTimeZone();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  return format.dateTime(dateObject, {
    timeStyle: "short",
    hour12: !use24Hour,
    timeZone,
  });
}

export async function FormatDateOnly(date: string | Date) {
  const format = await getFormatter();
  const timeZone = await getTimeZone();

  if (!date) return "";

  const dateObject = typeof date === 'string' ? new Date(date) : date;

  return format.dateTime(dateObject, {
    dateStyle: "medium",
    timeZone,
  });
}

// IMPROVED: Server-side date picker display format
export async function FormatDateTimeForDisplay(date: Date | null): Promise<string> {
  const format = await getFormatter();
  const timeZone = await getTimeZone();

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
