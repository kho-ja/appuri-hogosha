import { routing } from "@/i18n/routing";

const publicPages = ["/login", "/forgot-password", "/parentnotification"];
const onlyAdminPathNames = ["/permissions"];

export const onlyAdminPathNameRegex = RegExp(
  `^(/(${routing.locales.join("|")}))?(${onlyAdminPathNames
    .flatMap((p) => (p === "/" ? ["", "/"] : p))
    .join("|")})/?$`,
  "i"
);

export const publicPathnameRegex = RegExp(
  `^(/(${routing.locales.join("|")}))?(${publicPages
    .flatMap((p) => (p === "/" ? ["", "/"] : p))
    .join("|")})/?$`,
  "i"
);
