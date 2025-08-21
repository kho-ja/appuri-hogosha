import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { locales, localePrefix } from "@/navigation";

const publicPages = ["/login", "/forgot-password", "/parentnotification"];

const onlyAdminPathNames = ["/permissions"];

export const onlyAdminPathNameRegex = RegExp(
  `^(/(${locales.join("|")}))?(${onlyAdminPathNames
    .flatMap((p) => (p === "/" ? ["", "/"] : p))
    .join("|")})/?$`,
  "i"
);

export const publicPathnameRegex = RegExp(
  `^(/(${locales.join("|")}))?(${publicPages
    .flatMap((p) => (p === "/" ? ["", "/"] : p))
    .join("|")})/?$`,
  "i"
);

const intlMiddleware = createMiddleware({
  locales,
  localePrefix,
  defaultLocale: "uz",
});

const authMiddleware = auth((req) => {
  const isAdminPath = onlyAdminPathNameRegex.test(req.nextUrl.pathname);
  const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

  // If user is not logged in and trying to access a non-public page, redirect to login
  if (!req.auth && !isPublicPage) {
    const newUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  // If user is logged in and trying to access auth pages, redirect to home page
  if (
    req.auth &&
    (req.nextUrl.pathname.endsWith("/login") ||
      req.nextUrl.pathname.endsWith("/forgot-password"))
  ) {
    const newUrl = new URL("/", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  // If non-admin user is trying to access an admin page, redirect to home page
  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    const newUrl = new URL("/", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  return intlMiddleware(req);
});

export default function middleware(req: NextRequest) {
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
