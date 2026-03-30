import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://appuri-hogosha.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/parentnotification",
          "/en/parentnotification",
          "/ja/parentnotification",
          "/ru/parentnotification",
          "/blog",
          "/en/blog",
          "/ja/blog",
          "/ru/blog",
          "/login",
          "/en/login",
          "/ja/login",
          "/ru/login",
        ],
        disallow: [
          "/dashboard",
          "/students",
          "/parents",
          "/groups",
          "/messages",
          "/admins",
          "/settings",
          "/permissions",
          "/forms",
          "/sms",
          "/fromcsv",
          "/fromKintone",
          "/instruction",
          "/api/",
          "/en/dashboard",
          "/ja/dashboard",
          "/ru/dashboard",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
