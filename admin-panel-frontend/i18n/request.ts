import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = (await requestLocale) as Locale | undefined;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }
  if (!locale) notFound();

  const cookieStore = await cookies();
  const clientTimezone = cookieStore.get("user-timezone")?.value;
  const timeZone = clientTimezone || "UTC";

  return {
    locale,
    now: new Date(),
    timeZone,
    messages: {
      ...(await import(`@/messages/${locale}.json`)).default,
      ...(await import(`@/messages/zod/${locale}.json`)).default,
    },
  };
});
