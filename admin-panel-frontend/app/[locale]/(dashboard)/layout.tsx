"use client";

import { useEffect, useState } from "react";
import { Link } from "@/navigation";
import {
  Bell,
  CircleUser,
  Menu,
  Package2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ToggleMode } from "@/components/toggle-mode";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import NavLinks from "@/components/NavLinks";
import LanguageSelect from "@/components/LanguageSelect";
import { User } from "next-auth";

const handleSignOut = async () => {
  return await signOut({ callbackUrl: "/" });
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession({ required: true });
  const t = useTranslations("app");
  const tName = useTranslations("names");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(() => {
  const saved = localStorage.getItem("sidebar-open");
  return saved === null ? true : saved === "true";
});


  const user = session?.user as User;

  if (session?.error === "RefreshAccessTokenError") handleSignOut();
  useEffect(() => {
  const saved = localStorage.getItem("sidebar-open");
  if (saved !== null) {
    setIsMenuOpen(saved === "true");
  }
  }, []);


  const toggleSidebar = () => {
    setIsMenuOpen((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-open", String(newValue));
      return newValue;
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      {isMenuOpen !== undefined && (
        <div
          className={`fixed top-0 bottom-0 left-0 z-20 hidden md:block ${
            isMenuOpen ? "w-[220px] lg:w-[280px]" : "w-[75px]"
          } border-r bg-muted/40 overflow-y-auto transition-[width] duration-300 ease-in-out`}
        >
          <div className="flex flex-col gap-2 h-[100dvh]">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link
                href="/"
                className={`flex items-center gap-2 font-semibold leading-none ${
                  !isMenuOpen && "justify-center"
                }`}
              >
                <Package2 className="h-6 w-6" />
                {isMenuOpen && <span>{session?.schoolName}</span>}
              </Link>
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <NavLinks user={user} isMenuOpen={isMenuOpen} />
              </nav>
            </div>
          </div>
        </div>
      )}
      <div
        className={`flex flex-col flex-1 ${
          isMenuOpen ? "md:ml-[220px] lg:ml-[280px]" : "md:ml-[75px]"
        } min-w-0 transition-all duration-300`}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("menu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex flex-col w-[280px] max-w-[75vw]"
            >
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-5"
                >
                  <Package2 className="h-6 w-6" />
                  <span>{session?.schoolName}</span>
                </Link>
                <NavLinks
                  user={user}
                  isMenuOpen={true}
                  onLinkClick={() => setIsSheetOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="hidden md:block">
            <Button
              variant="outline"
              size="icon"
              className="ml-auto h-10 w-10"
              onClick={toggleSidebar}
            >
              {isMenuOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="sm:flex gap-2 hidden">
            <LanguageSelect />
            <ToggleMode />
          </div>
          <div className="flex items-center justify-end w-full gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className="cursor-pointer">
                    {user && tName("name", { ...user })}
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                  >
                    <CircleUser className="h-5 w-5" />
                    <span className="sr-only">{t("account")}</span>
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <div>{t("account")}</div>
                    <div className="text-gray-600">{user?.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t("settings")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>{t("support")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => await signOut()}>
                  {t("logout")}
                </DropdownMenuItem>
                <div className="sm:hidden">
                  <DropdownMenuSeparator />
                  <div className="flex gap-2">
                    <LanguageSelect />
                    <ToggleMode />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}