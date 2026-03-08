import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL, LOCALES, LOCALE_PATH_MAP, localePath } from "@/lib/i18nConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const parentNotificationEntries = (Object.entries(LOCALE_PATH_MAP) as [string, string][]).map(
    ([, prefix]) => ({
      url: `${SITE_URL}${prefix}/parentnotification`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries([
          ...LOCALES.map((l) => [l, `${SITE_URL}${localePath(l)}/parentnotification`]),
          ["x-default", `${SITE_URL}/parentnotification`],
        ]),
      },
    })
  );

  const loginEntries = Object.entries(LOCALE_PATH_MAP).map(([, prefix]) => ({
    url: `${SITE_URL}${prefix}/login`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  const blogListEntries = Object.entries(LOCALE_PATH_MAP).map(([, prefix]) => ({
    url: `${SITE_URL}${prefix}/blog`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // One getAllPosts call per locale (not per slug)
  const blogPostEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => {
    const prefix = localePath(locale);
    return getAllPosts(locale).map((post) => ({
      url: `${SITE_URL}${prefix}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}${localePath(l)}/blog/${post.slug}`])
        ),
      },
    }));
  });

  return [
    ...parentNotificationEntries,
    ...loginEntries,
    ...blogListEntries,
    ...blogPostEntries,
  ];
}
