"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

type Props = {
  date: string;
  options?: Intl.DateTimeFormatOptions;
};

export default function ClientDateTime({
  date,
  options = {
    dateStyle: "medium",
    timeStyle: "short",
  },
}: Props) {
  const locale = useLocale();

  const formatted = useMemo(() => {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(d);
  }, [date, locale, options]);

  return <span>{formatted}</span>;
}
