import { locales } from "@/navigation";
export const publicPages = [
  "/login",
  "/forgot-password",
  "/parentnotification",
];

export const onlyAdminPathNames = ["/permissions"];

export const publicPathnameRegex = RegExp(
  `^(/(${locales.join("|")}))?(${publicPages.join("|")})/?$`,
  "i"
);

export const onlyAdminPathNameRegex = RegExp(
  `^(/(${locales.join("|")}))?(${onlyAdminPathNames.join("|")})/?$`,
  "i"
);
