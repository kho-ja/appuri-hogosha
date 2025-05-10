import React from "react";
import {
  Home,
  LineChart,
  Users,
  BookCheck,
  GraduationCap,
  Contact,
  MessageCircle,
  ShieldCheck,
  MessageSquare,
  Settings,
} from "lucide-react";
import { onlyAdminPathNameRegex } from "@/middleware";
import NavLink from "./NavLink";
import { useTranslations } from "next-intl";
import { User } from "next-auth";

const navLinks = [
  {
    id: 1,
    href: "/dashboard",
    icon: Home,
    nameKey: "dashboard",
  },
  // {
  //   id: 2,
  //   href: "/forms",
  //   icon: BookCheck,
  //   nameKey: "forms",
  //   badge: 0,
  // },
  {
    id: 3,
    href: "/permissions",
    icon: Users,
    nameKey: "permissions",
  },
  {
    id: 4,
    href: "/messages",
    icon: MessageCircle,
    nameKey: "messages",
  },
  {
    id: 5,
    href: "/students",
    icon: GraduationCap,
    nameKey: "students",
  },
  {
    id: 6,
    href: "/groups",
    icon: Users,
    nameKey: "groups",
  },
  {
    id: 7,
    href: "/parents",
    icon: Contact,
    nameKey: "parents",
  },
  {
    id: 8,
    href: "/admins",
    icon: ShieldCheck,
    nameKey: "admins",
  },
  /* {
    id: 9,
    href: "#",
    icon: LineChart,
    nameKey: "analytics",
  },*/
  // {
  //   id: 10,
  //   href: "/sms",
  //   icon: MessageSquare,
  //   nameKey: "sms",
  // },
  {
    id: 11,
    href: "/settings",
    icon: Settings,
    nameKey: "settings",
  },
];

const NavLinks = ({
  user,
  onLinkClick,
  isMenuOpen,
}: {
  user: User;
  onLinkClick?: () => void;
  isMenuOpen: boolean;
}) => {
  const t = useTranslations("nav");

  return (
    <>
      {navLinks.map((link) => {
        const isAdminPath = onlyAdminPathNameRegex.test(link.href);
        if (isAdminPath && user?.role !== "admin") {
          return null;
        }
        return (
          <NavLink
            key={link.id}
            href={link.href}
            Icon={link.icon}
            name={t(link.nameKey)}
            isMenuOpen={isMenuOpen}
            onLinkClick={onLinkClick}
          />
        );
      })}
    </>
  );
};

export default NavLinks;
