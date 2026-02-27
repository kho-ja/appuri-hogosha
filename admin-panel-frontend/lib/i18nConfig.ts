/** Shared locale → URL-prefix map (defaultLocale "uz" has no prefix). */
export const LOCALES = ["en", "uz", "ja", "ru"] as const;
export type SupportedLocale = (typeof LOCALES)[number];

export const LOCALE_PATH_MAP: Record<string, string> = {
  uz: "",
  en: "/en",
  ja: "/ja",
  ru: "/ru",
};

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://appuri-hogosha.vercel.app";

export function localePath(locale: string): string {
  return LOCALE_PATH_MAP[locale] ?? `/${locale}`;
}
