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
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-open");
      setIsMenuOpen(saved === null ? true : saved === "true");
    }
  }, []);

  const user = session?.user as User;

  if (session?.error === "RefreshAccessTokenError") handleSignOut();

  const toggleSidebar = () => {
    setIsMenuOpen((prev) => {
      const newValue = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar-open", String(newValue));
      }
      return newValue;
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {isMenuOpen !== undefined && (
        <div
          className={`
            fixed top-0 bottom-0 left-0 z-20 hidden md:block border-r bg-muted/40 
            overflow-hidden transition-all duration-300 ease-in-out backdrop-blur-sm
            ${isMenuOpen ? "w-[220px] lg:w-[280px] shadow-lg" : "w-[75px] shadow-md"}
          `}
        >
          <div className="flex flex-col gap-2 h-[100dvh]">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 backdrop-blur-sm">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold leading-none transition-all duration-300"
              >
                <Package2 className="h-6 w-6 flex-shrink-0 transition-transform duration-200 hover:scale-110" />
                <span className={`
                  transition-all duration-300 ease-in-out whitespace-nowrap
                  ${isMenuOpen 
                    ? "opacity-100 translate-x-0 max-w-[200px]" 
                    : "opacity-0 translate-x-4 max-w-0"
                  }
                `}>
                  {session?.schoolName}
                </span>
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                <NavLinks user={user} isMenuOpen={isMenuOpen} />
              </nav>
            </div>
          </div>
        </div>
      )}
      
      <div
        className={`
          flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out
          ${isMenuOpen ? "md:ml-[220px] lg:ml-[280px]" : "md:ml-[75px]"}
        `}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden hover:scale-105 transition-transform duration-200"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("menu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex flex-col w-[280px] max-w-[75vw] backdrop-blur-lg"
            >
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-5 hover:scale-105 transition-transform duration-200"
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
              className="ml-auto h-10 w-10 hover:scale-105 transition-all duration-200 hover:shadow-md"
              onClick={toggleSidebar}
            >
              <div className="transition-transform duration-300">
                {isMenuOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </Button>
          </div>
          
          <div className="sm:flex gap-2 hidden">
            <LanguageSelect />
            <ToggleMode />
          </div>
          
          <div className="flex items-center justify-end w-full gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
                  <span className="cursor-pointer transition-colors duration-200 hover:text-primary">
                    {user && tName("name", { ...user })}
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full hover:scale-110 transition-all duration-200 hover:shadow-md"
                  >
                    <CircleUser className="h-5 w-5" />
                    <span className="sr-only">{t("account")}</span>
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="backdrop-blur-lg">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <div>{t("account")}</div>
                    <div className="text-gray-600">{user?.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="hover:bg-muted/50 transition-colors duration-200">
                  <Link href="/settings">{t("settings")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-muted/50 transition-colors duration-200">
                  {t("support")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => await signOut()}
                  className="hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                >
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
        
        <main className="flex-1 overflow-auto p-4 lg:p-6 animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}