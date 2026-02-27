import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://appuri-hogosha.vercel.app";

// defaultLocale "uz" uses no prefix (localePrefix: "as-needed")
const localePathMap: Record<string, string> = {
  uz: "",
  en: "/en",
  ja: "/ja",
  ru: "/ru",
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Generate entries for each locale
  const parentNotificationEntries = Object.entries(localePathMap).map(
    ([locale, prefix]) => ({
      url: `${siteUrl}${prefix}/parentnotification`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 1.0,
      alternates: {
        languages: {
          en: `${siteUrl}/en/parentnotification`,
          uz: `${siteUrl}/parentnotification`,
          ja: `${siteUrl}/ja/parentnotification`,
          ru: `${siteUrl}/ru/parentnotification`,
          "x-default": `${siteUrl}/parentnotification`,
        },
      },
    })
  );

  const loginEntries = Object.entries(localePathMap).map(([, prefix]) => ({
    url: `${siteUrl}${prefix}/login`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...parentNotificationEntries, ...loginEntries];
}
