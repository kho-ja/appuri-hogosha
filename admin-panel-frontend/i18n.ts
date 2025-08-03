import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { locales } from "@/navigation";
// Can be imported from a shared config

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Detect user's timezone using multiple methods
  const cookieStore = cookies();
  const clientTimezone = cookieStore.get('user-timezone')?.value;

  // Fallback to Vercel's IP-based detection
  const headersList = headers();
  const vercelTimezone = headersList.get('x-vercel-ip-timezone');

  // Final fallback to UTC
  const timeZone = clientTimezone || vercelTimezone || 'UTC';

  return {
    // Prevent hydration mismatches
    now: new Date(),
    timeZone,
    messages: {
      ...(await import(`@/messages/${locale}.json`)).default,
      ...(await import(`./messages/zod/${locale}.json`)).default,
    },
  };
});
