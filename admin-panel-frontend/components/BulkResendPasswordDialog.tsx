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
import { RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import { toast } from "@/components/ui/use-toast";
import Parent from "@/types/parent";

interface BulkResendPasswordDialogProps {
  selectedParents: Parent[];
  onSuccess?: () => void;
  disabled?: boolean;
}

const BulkResendPasswordDialog: React.FC<BulkResendPasswordDialogProps> = ({
  selectedParents,
  onSuccess,
  disabled = false,
}) => {
  const t = useTranslations("BulkResendPasswordDialog");
  const tName = useTranslations("names");
  const [isOpen, setIsOpen] = useState(false);

  const parentsNeedingPassword = selectedParents.filter(
    (parent) => !parent.last_login_at && !parent.arn
  );

  const { mutate, isPending } = useApiMutation<
    {
      message: string;
      successful_count: number;
      failed_count: number;
      results: Array<{
        parent_id: number;
        success: boolean;
        message: string;
      }>;
    },
    { parentIds: number[] }
  >(`parent/bulk-resend-password`, "POST", [`bulk-resend-password`], {
    onSuccess: (data) => {
      toast({
        title: t("bulkResendSuccess"),
        description: t("bulkResendSuccessDescription", {
          successful: data.successful_count,
          total: parentsNeedingPassword.length,
        }),
      });
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      let errorMessage = t("bulkResendError");

      console.error("Error bulk resending passwords:", error);

      if (error.message) {
        errorMessage = error.message || t("bulkResendError");
      }

      toast({
        title: t("bulkResendError"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleBulkResend = () => {
    const parentIds = parentsNeedingPassword.map((parent) => parent.id);
    mutate({ parentIds });
  };

  const getParentDisplayName = (parent: Parent) => {
    const given = (parent.given_name || "").trim();
    const family = (parent.family_name || "").trim();
    const hasName = given || family;

    if (!hasName && (parent.students?.length ?? 0) > 0) {
      const s = parent.students![0];
      return tName("name", {
        given_name: s.given_name,
        family_name: s.family_name,
      });
    }

    return hasName
      ? tName("name", {
          given_name: parent.given_name,
          family_name: parent.family_name,
        })
      : parent.phone_number || parent.email || String(parent.id);
  };

  const isDisabled = disabled || parentsNeedingPassword.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={isDisabled || isPending}
          icon={<RefreshCcw className="h-4 w-4" />}
        >
          {t("bulkResendPassword")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("bulkResendPassword")}</DialogTitle>
          <DialogDescription className="space-y-2">
            {parentsNeedingPassword.length > 0 ? (
              <>
                <div className="mb-4">{t("bulkResendDescription")}</div>
                <div className="mb-2 font-semibold">
                  {t("parentsWillReceiveSMS", {
                    count: parentsNeedingPassword.length,
                  })}
                </div>
                <div className="max-h-60 overflow-y-auto border rounded p-3 space-y-1">
                  {parentsNeedingPassword.map((parent) => (
                    <div
                      key={parent.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{getParentDisplayName(parent)}</span>
                      <span className="text-muted-foreground">
                        {parent.phone_number}
                      </span>
                    </div>
                  ))}
                </div>
                {selectedParents.length > parentsNeedingPassword.length && (
                  <div className="mt-4 p-3 bg-muted rounded">
                    <div className="font-semibold text-sm mb-1">
                      {t("alreadyLoggedInParents")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("skippingLoggedInParents", {
                        count:
                          selectedParents.length -
                          parentsNeedingPassword.length,
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-muted-foreground">
                  {selectedParents.length === 0
                    ? t("noParentsSelected")
                    : t("allParentsAlreadyLoggedIn")}
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        {parentsNeedingPassword.length > 0 && (
          <>
            <div className="flex text-sm text-muted-foreground">
              {t("bulkResendConfirm")}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isPending}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button onClick={handleBulkResend} isLoading={isPending}>
                {t("sendPasswordsToParents", {
                  count: parentsNeedingPassword.length,
                })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkResendPasswordDialog;
