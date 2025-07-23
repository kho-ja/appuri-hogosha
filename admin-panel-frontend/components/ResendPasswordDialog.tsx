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
import { RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import { toast } from "@/components/ui/use-toast";

interface ResendPasswordDialogProps {
  id: number;
  name: string;
  identifier: string;
  type: "parent" | "admin";
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

const ResendPasswordDialog: React.FC<ResendPasswordDialogProps> = ({
  id,
  name,
  identifier,
  type,
  variant = "icon",
  size = "default",
}) => {
  const t = useTranslations("ResendPasswordDialog");
  const [isOpen, setIsOpen] = useState(false);

  const { mutate, isPending } = useApiMutation<{
    message: string;
    parent_name?: string;
    admin_name?: string;
    email: string;
  }>(`${type}/${id}/resend-password`, "POST", [`resend-password-${type}`, id], {
    onSuccess: (data) => {
      toast({
        title: t("resendPasswordSuccess"),
        description: `${data.message} - ${data.email}`,
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      let errorMessage = t("resendPasswordError");

      console.error("Error resending password:", error);

      if (error.message) {
        // Handle specific error messages
        if (
          error.message ===
          "User has already activated their account. No temporary password needed."
        ) {
          errorMessage = t("userAlreadyActive");
        } else if (error.message === "User not found") {
          errorMessage = "User not found in the system.";
        } else {
          errorMessage = error.message || t("resendPasswordError");
        }
      }

      console.error("Resend password error:", errorMessage);

      toast({
        title: t("resendPasswordError"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleResend = () => {
    mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={isPending}
          icon={<RefreshCcw className="h-4 w-4" />}
        >
          {variant !== "icon" ? t("resendPassword") : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("resendPassword")}</DialogTitle>
          <DialogDescription className="space-y-2">
            <strong>{name}</strong>
            <br />
            {identifier}
            <br />
            {type === "parent"
              ? t("resendPasswordDescriptionPhone")
              : t("resendPasswordDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex text-sm">{t("resendPasswordConfirm")}</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleResend} isLoading={isPending}>
            {t("resendPassword")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResendPasswordDialog;
