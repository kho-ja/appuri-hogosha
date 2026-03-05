import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
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
    const redirectUrl = new URL("/api/oauth/complete", req.nextUrl.origin);
    const paramsArray = Array.from(req.nextUrl.searchParams.entries());
    paramsArray.forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
    return Response.redirect(redirectUrl);
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

  if (!req.auth && !isPublicPage) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (
    req.auth &&
    (req.nextUrl.pathname.endsWith("/login") ||
      req.nextUrl.pathname.endsWith("/forgot-password"))
  ) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = new URL(`/${locale}`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    const locale = req.nextUrl.locale || routing.defaultLocale;
    const newUrl = new URL(`/${locale}`, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  return intlMiddleware(req);
});

export default function proxy(req: NextRequest) {
  return (authMiddleware as unknown as (req: NextRequest) => Response)(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
