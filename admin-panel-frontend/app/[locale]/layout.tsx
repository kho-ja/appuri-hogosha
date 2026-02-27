import type { Metadata } from "next";
import "@/app/[locale]/globals.css";
import { ThemeProvider } from "@/contexts/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import ReactQueryProvider from "@/contexts/ReactQueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/auth";
import TimezoneDetector from "@/components/TimezoneDetector";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://appuri-hogosha.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const session = await auth();

  const defaultTitle = "Appuri Hogosha";
  const title = session?.schoolName
    ? String(session.schoolName)
    : defaultTitle;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${defaultTitle}`,
    },
    description:
      "School notification platform — real-time updates on university activities, grades, and attendance for parents.",
    applicationName: "Appuri Hogosha",
    authors: [{ name: "Appuri Hogosha" }],
    keywords: [
      "school notification",
      "parent app",
      "university",
      "attendance",
      "grades",
      "学校通知",
      "保護者アプリ",
    ],
    openGraph: {
      type: "website",
      siteName: "Appuri Hogosha",
      title: defaultTitle,
      description:
        "Real-time updates on university activities, grades, and attendance. Stay connected with your child's education.",
      locale: locale,
      alternateLocale: ["en", "uz", "ja", "ru"].filter((l) => l !== locale),
      url: `${siteUrl}/${locale}`,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Appuri Hogosha — School Notification Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description:
        "Real-time updates on university activities, grades, and attendance.",
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        en: `${siteUrl}/en`,
        uz: `${siteUrl}`,
        ja: `${siteUrl}/ja`,
        ru: `${siteUrl}/ru`,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SessionProvider>
              <ReactQueryProvider>
                <TimezoneDetector />
                {children}
              </ReactQueryProvider>
            </SessionProvider>
          </ThemeProvider>
          <Toaster />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
