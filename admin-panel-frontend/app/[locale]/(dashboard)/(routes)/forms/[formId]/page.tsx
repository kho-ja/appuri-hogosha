import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { notFound, redirect } from "next/navigation";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { FormatDate, FormatDateTime } from "@/lib/server/utils";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import DisplayProperty from "@/components/DisplayProperty";
import NotFound from "@/components/NotFound";
import Form from "@/types/form";

export default async function ThisForm({
  params: { formId },
}: {
  params: { formId: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/form/${formId}`,
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
    throw new Error("Failed to fetch data");
  }

  const formData = await response.json();
  const t = await getTranslations("ThisForm");

  return (
    <div className="space-y-4">
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("posts")}</h1>
        <Link href={`/forms`}>
          <Button variant={"secondary"}>{t("back")}</Button>
        </Link>
      </div>
      <Card className="space-y-4">
        <CardHeader>
          <DisplayProperty
            property={t("reason")}
            value={formData?.form?.reason}
          />
          <DisplayProperty
            property={t("status")}
            value={formData?.form?.status}
          />
          <DisplayProperty
            property={t("additionalMessage")}
            value={formData?.form?.additional_message}
          />
          <DisplayProperty
            property={t("date")}
            value={await FormatDate(formData?.form?.date)}
          />
          <DisplayProperty
            property={t("sentAt")}
            value={await FormatDateTime(formData?.form?.sent_at)}
          />
        </CardHeader>
        <Separator />
        <CardContent className="space-y-2">
          <h2 className="text-2xl w-2/4 font-bold">{t("parent")}</h2>
          <DisplayProperty
            property={t("given_name")}
            value={formData?.parent?.given_name}
          />
          <DisplayProperty
            property={t("family_name")}
            value={formData?.parent?.family_name}
          />
          <DisplayProperty
            property={t("phone_number")}
            value={formData?.parent?.phone_number}
          />
          <Separator />
          <h2 className="text-2xl w-2/4 font-bold">{t("student")}</h2>
          <DisplayProperty
            property={t("given_name")}
            value={formData?.student?.given_name}
          />
          <DisplayProperty
            property={t("family_name")}
            value={formData?.student?.family_name}
          />
          <DisplayProperty
            property={t("phone_number")}
            value={formData?.student?.phone_number}
          />
          <DisplayProperty
            property={t("student_number")}
            value={formData?.student?.student_number}
          />
        </CardContent>
      </Card>
    </div>
  );
}
