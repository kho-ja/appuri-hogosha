import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { onlyAdminPathNameRegex, publicPathnameRegex } from "@/lib/routeAccess";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const hasOAuthParams =
    req.nextUrl.searchParams.has("access_token") &&
    req.nextUrl.searchParams.has("user");
  if (hasOAuthParams) {
    const redirectUrl = new URL("/api/oauth/complete", req.nextUrl.origin);
    const paramsArray = Array.from(req.nextUrl.searchParams.entries());
    paramsArray.forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
    return NextResponse.redirect(redirectUrl);
  }

  const session = await auth();
  let isPublicPage = publicPathnameRegex.test(pathname);

  if (!isPublicPage) {
    if (
      pathname.startsWith("/parentnotification") ||
      routing.locales.some((locale) =>
        pathname.startsWith(`/${locale}/parentnotification`)
      )
    ) {
      isPublicPage = true;
    }
  }

  if (!session && !isPublicPage) {
    let locale = routing.defaultLocale;
    for (const loc of routing.locales) {
      if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
        locale = loc;
        break;
      }
    }

    const loginPath = locale === routing.defaultLocale ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(new URL(loginPath, req.nextUrl.origin));
  }

  if (
    session &&
    (pathname.endsWith("/login") || pathname.endsWith("/forgot-password") ||
      pathname === "/login" || pathname === "/forgot-password")
  ) {
    let locale = routing.defaultLocale;
    for (const loc of routing.locales) {
      if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
        locale = loc;
        break;
      }
    }

    const dashboardPath = locale === routing.defaultLocale ? "/dashboard" : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(dashboardPath, req.nextUrl.origin));
  }

  const isAdminPath = onlyAdminPathNameRegex.test(pathname);

  if (session && session.user?.role !== "admin" && isAdminPath) {
    let locale = routing.defaultLocale;
    for (const loc of routing.locales) {
      if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) {
        locale = loc;
        break;
      }
    }

    const dashboardPath = locale === routing.defaultLocale ? "/dashboard" : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(dashboardPath, req.nextUrl.origin));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
