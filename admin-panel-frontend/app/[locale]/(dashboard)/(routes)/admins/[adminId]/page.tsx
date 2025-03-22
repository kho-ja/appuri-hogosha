import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import DisplayProperty from "@/components/DisplayProperty";
import { FormatDateTime } from "@/lib/server/utils";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { signIn } from "next-auth/react";
import NotFound from "@/components/NotFound";

export default async function ThisAdmin({
  params: { adminId },
}: {
  params: { adminId: string };
}) {
  const session = await auth();

  if (!session) await signIn();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/${adminId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.sessionToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return <NotFound />;
    throw new Error("An error occurred while fetching the data");
  }

  const adminData = await response.json();

  const t = await getTranslations("ThisAdmin");

  return (
    <div className="space-y-4">
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("AdminView")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admins`}>
            <Button variant={"secondary"}>{t("back")}</Button>
          </Link>
          <Link href={`/admins/edit/${adminId}`}>
            <Button>{t("editAdmin")}</Button>
          </Link>
        </div>
      </div>
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
            value={await FormatDateTime(adminData?.admin?.created_at)}
          />
        </CardHeader>
        <Separator />
      </Card>
    </div>
  );
}
