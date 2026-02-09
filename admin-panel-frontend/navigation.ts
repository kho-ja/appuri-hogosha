import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { locales, defaultLocale, localePrefix } = routing;

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
