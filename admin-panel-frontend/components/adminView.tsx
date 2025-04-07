"use client";

import { Card, CardHeader } from "@/components/ui/card";
import DisplayProperty from "@/components/DisplayProperty";
import { useTranslations } from "next-intl";
import { FormatDateTime } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const AdminView = ({ adminId, adminData }: any) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      router.refresh();
    //   refreshHandler();
    });
  }, []);

//   const refreshHandler = () => {
//     if (isPending) {
//       console.log("pending");
//       return <div>Loading...</div>;
//     }
//   };

  const t = useTranslations("ThisAdmin");

  return (
    <div>
      <Card className="space-y-4">
        <CardHeader>
          <DisplayProperty
            property={t("adminGivenName")}
            value={adminData?.admin?.given_name}
          />
          <DisplayProperty
            property={t("adminFamilyName")}
            value={adminData?.admin?.family_name}
          />
          <DisplayProperty
            property={t("adminEmail")}
            value={adminData?.admin?.email}
          />
          <DisplayProperty
            property={t("adminPhoneNumber")}
            value={adminData?.admin?.phone_number}
          />
          <DisplayProperty
            property={t("adminCreationDate")}
            value={FormatDateTime(adminData?.admin?.created_at)}
          />
        </CardHeader>
        <Separator />
      </Card>
    </div>
  );
};

export default AdminView;
