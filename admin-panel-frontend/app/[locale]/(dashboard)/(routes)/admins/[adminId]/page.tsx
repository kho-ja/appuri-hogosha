import { Card, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import DisplayProperty from "@/components/DisplayProperty";
import { FormatDateTime } from "@/lib/server/utils";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NotFound from "@/components/NotFound";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import ResendPasswordDialog from "@/components/ResendPasswordDialog";
import Admin from "@/types/admin";

export default async function ThisAdmin({
  params,
}: {
  params: Promise<{ adminId: string; locale: string }>;
}) {
  const { adminId, locale } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  let adminData: { admin: Admin } | null = null;
  try {
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
      throw new Error("Failed to load admin");
    }

    adminData = await response.json();
  } catch (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admin">
          <BackButton href="/admins" />
        </PageHeader>
        <Card className="space-y-4">
          <CardHeader>
            <DisplayProperty property="Error" value="Failed to load admin." />
          </CardHeader>
          <Separator />
        </Card>
      </div>
    );
  }

  const t = await getTranslations("ThisAdmin");
  const tName = await getTranslations("names");

  return (
    <div className="space-y-4">
      <PageHeader title={t("AdminView")}>
        <BackButton href={`/admins`} />
        {adminData && (
          <ResendPasswordDialog
            id={adminData.admin.id}
            name={tName("name", {
              given_name: adminData.admin.given_name,
              family_name: adminData.admin.family_name,
            })}
            identifier={adminData.admin.email}
            type="admin"
            variant="button"
            size="default"
          />
        )}
        <Link href={`/admins/edit/${adminId}`}>
          <Button>{t("editAdmin")}</Button>
        </Link>
      </PageHeader>
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
            value={await FormatDateTime(adminData?.admin?.created_at as string)}
          />
        </CardHeader>
        <Separator />
      </Card>
    </div>
  );
}
