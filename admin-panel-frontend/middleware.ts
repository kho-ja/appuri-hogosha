import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { locales, localePrefix } from "@/navigation";
import { publicPathnameRegex, onlyAdminPathNameRegex } from "@/lib/routes";

const intlMiddleware = createMiddleware({
  locales,
  localePrefix,
  defaultLocale: "uz",
});

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  const isPublicPage = publicPathnameRegex.test(pathname);
  const isAdminPath = onlyAdminPathNameRegex.test(pathname);

  if (isPublicPage) {
    if (
      isLoggedIn &&
      (pathname.includes("/login") || pathname.includes("/forgot-password"))
    ) {
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }
    return intlMiddleware(req);
  }

  if (!isLoggedIn) {
    const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || "uz";
    return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl.origin));
  }

  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
