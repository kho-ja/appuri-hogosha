import { DateTimeFormatOptions } from "next-intl";
import { getFormatter } from "next-intl/server";
import { convertTimeToUTC } from "../utils";

export async function FormatDate(
  date: string,
  style: string | DateTimeFormatOptions | undefined = {
    dateStyle: "long",
  } as DateTimeFormatOptions
) {
  const format = await getFormatter();
  return date && format.dateTime(convertTimeToUTC(date), style);
}

export async function FormatDateTime(
  date: string,
  style: string | DateTimeFormatOptions | undefined = {
    dateStyle: "medium",
    timeStyle: "short",
  } as DateTimeFormatOptions
) {
  const format = await getFormatter();
  return date && format.dateTime(convertTimeToUTC(date), style);
}
