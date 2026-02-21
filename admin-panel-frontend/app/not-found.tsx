import { routing, type Locale } from "@/i18n/routing";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import "./[locale]/globals.css";

async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
    if (
      localeCookie &&
      routing.locales.includes(localeCookie as Locale)
    ) {
      return localeCookie as Locale;
    }
  } catch {}

  try {
    const headersList = await headers();
    const acceptLang = headersList.get("accept-language") || "";
    for (const locale of routing.locales) {
      if (acceptLang.includes(locale)) {
        return locale;
      }
    }
  } catch {}

  return routing.defaultLocale;
}

async function getMessages(locale: Locale) {
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return messages.errors as {
    pageNotFound: string;
    notFoundDescription: string;
    returnHome: string;
  };
}

export default async function RootNotFound() {
  const locale = await getLocale();
  const t = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-7xl font-bold tracking-tighter sm:text-8xl">
                404
              </h1>
              <h2 className="text-xl font-semibold text-red-500">
                {t.pageNotFound}
              </h2>
              <p className="max-w-md text-gray-500 dark:text-gray-400">
                {t.notFoundDescription}
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-gray-900 dark:bg-gray-100 px-6 py-3 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
            >
              {t.returnHome}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
