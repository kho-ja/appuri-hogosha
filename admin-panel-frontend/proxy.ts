import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { onlyAdminPathNameRegex, publicPathnameRegex } from "@/lib/routeAccess";

const intlMiddleware = createMiddleware(routing);

const authMiddleware = auth((req) => {
  const isAdminPath = onlyAdminPathNameRegex.test(req.nextUrl.pathname);
  let isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

  const hasOAuthParams =
    req.nextUrl.searchParams.has("access_token") &&
    req.nextUrl.searchParams.has("user");
  if (hasOAuthParams) {
    // FIX: URL manzilini va barcha query parametrlarni xavfsiz nusxalaymiz
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/api/oauth/complete";
    
    // Nusxalangan URL bilan redirect qilamiz (localhost muammosi hal bo'ladi)
    return NextResponse.redirect(redirectUrl);
  }

  if (!isPublicPage) {
    const path = req.nextUrl.pathname;
    if (
      path.startsWith("/parentnotification") ||
      routing.locales.some((locale) =>
        path.startsWith(`/${locale}/parentnotification`)
      )
    ) {
      isPublicPage = true;
    }
  }

  // Redirect to login if not authenticated and not on public page
  if (!req.auth && !isPublicPage) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(newUrl);
  }

  // Redirect authenticated users away from login/forgot-password pages
  if (
    req.auth?.user &&
    (req.nextUrl.pathname.endsWith("/login") ||
      req.nextUrl.pathname.endsWith("/forgot-password"))
  ) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${locale}`;
    return NextResponse.redirect(newUrl);
  }

  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${locale}`;
    return NextResponse.redirect(newUrl);
  }

  return intlMiddleware(req);
});

export default function proxy(req: NextRequest) {
  return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
