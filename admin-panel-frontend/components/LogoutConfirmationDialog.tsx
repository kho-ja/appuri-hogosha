"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signOut } from "next-auth/react";

interface LogoutConfirmationDialogProps {
  children: React.ReactNode;
}

const LogoutConfirmationDialog: React.FC<LogoutConfirmationDialogProps> = ({
  children,
}) => {
  const t = useTranslations("LogoutConfirmationDialog");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: `/${locale}/login` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isLoading}>
              {t("no")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleLogout}
            isLoading={isLoading}
            variant="destructive"
          >
            {t("yes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutConfirmationDialog;
