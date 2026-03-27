import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import ReactQueryProvider from "@/contexts/ReactQueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { auth } from "@/auth";
import TimezoneDetector from "@/components/TimezoneDetector";

export async function generateMetadata() {
  const session = await auth();
  const metadata: Metadata = {
    title: {
      default: "JDU Parents",
      template: "%s | JDU Parents",
    },
    description:
      "JDU Parents notification platform — real-time updates on university activities, grades, and attendance for parents.",
  };
  if (session) {
    metadata.title = session?.schoolName;
  }
  return metadata;
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
      </body>
    </html>
  );
}
