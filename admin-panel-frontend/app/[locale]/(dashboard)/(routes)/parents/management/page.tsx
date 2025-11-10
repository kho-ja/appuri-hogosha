"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ParentTable } from "@/components/ParentTable";
import BulkResendPasswordDialog from "@/components/BulkResendPasswordDialog";
import PageHeader from "@/components/PageHeader";
import Parent from "@/types/parent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

export default function ParentManagementPage() {
  const t = useTranslations("parentManagement");
  const [selectedParents, setSelectedParents] = useState<Parent[]>([]);

  const handleBulkSuccess = () => {
    setSelectedParents([]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex">
        <PageHeader title={t("title")} variant="list" />
        <BackButton href="/parents" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            {t("bulkOperations")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                {t("selectParentsDescription")}
              </p>
              <div className="text-sm text-muted-foreground">
                {t("selectedCount", { count: selectedParents.length })}
              </div>
            </div>
            <div className="flex gap-2">
              <BulkResendPasswordDialog
                selectedParents={selectedParents}
                onSuccess={handleBulkSuccess}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="">
          <ParentTable
            selectedParents={selectedParents}
            setSelectedParents={setSelectedParents}
          />
        </CardContent>
      </Card>
    </div>
  );
}
