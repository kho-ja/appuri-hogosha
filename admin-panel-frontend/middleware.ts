import { auth } from "@/auth";
import createMiddleware from "next-intl/middleware";
import { locales, localePrefix } from "@/navigation";

const publicPages = ["/login", "/forgot-password", "/parentnotification"];

const onlyAdminPathNames = ["/permissions"];

function getLocale(pathname: string) {
  const seg = pathname.split("/")[1];
  return locales.includes(seg) ? seg : "uz";
}

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
  localeDetection: false,
});

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isAdminPath = onlyAdminPathNameRegex.test(pathname);
  let isPublicPage = publicPathnameRegex.test(pathname);

  // Treat OAuth callback with tokens in query as public so the home page can process and sign in
  const hasOAuthParams =
    req.nextUrl.searchParams.has("access_token") &&
    req.nextUrl.searchParams.has("user");
  if (hasOAuthParams) {
    // Redirect all OAuth callbacks to a server route that completes sign-in
    const redirectUrl = new URL("/api/oauth/complete", req.nextUrl.origin);
    const paramsArray = Array.from(req.nextUrl.searchParams.entries());
    paramsArray.forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
    return Response.redirect(redirectUrl, 307);
  }

  if (!isPublicPage) {
    if (
      pathname.startsWith("/parentnotification") ||
      locales.some((locale) =>
        pathname.startsWith(`/${locale}/parentnotification`)
      )
    ) {
      isPublicPage = true;
    }
  }

  // If user is not logged in and trying to access a non-public page, redirect to login
  if (!req.auth && !isPublicPage) {
    const locale = getLocale(req.nextUrl.pathname);
    const newUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
    return Response.redirect(newUrl, 307);
  }

  // If user is logged in and trying to access auth pages, redirect to home page
  if (
    req.auth &&
    (req.nextUrl.pathname.endsWith("/login") ||
      req.nextUrl.pathname.endsWith("/forgot-password"))
  ) {
    const locale = getLocale(req.nextUrl.pathname);
    const newUrl = new URL(`/${locale}/`, req.nextUrl.origin);
    return Response.redirect(newUrl, 307);
  }

  if (req.auth?.user?.role !== "admin" && isAdminPath) {
    const locale = getLocale(req.nextUrl.pathname);
    const newUrl = new URL(`/${locale}/`, req.nextUrl.origin);
    return Response.redirect(newUrl, 307);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
