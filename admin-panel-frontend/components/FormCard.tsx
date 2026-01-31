import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";
import Form from "@/types/form";
import { FormatDate, FormatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import DisplayProperty from "./DisplayProperty";

export default function FormCard({ form }: { form: Form }) {
  const t = useTranslations("forms");
  const tName = useTranslations("names");
  const { data: session } = useSession();

  const changeStatus = (status: "accept" | "reject") => async () => {
    if (!session) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/form/${form.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session?.sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      }
    );
    if (res.ok) {
      location.reload();
    } else {
      console.error("Failed to change status");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <CardTitle>{tName("name", { ...form.student, parents: "" })}</CardTitle>
        <CardDescription>{FormatDate(form.date)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="space-y-1.5">
              <DisplayProperty
                property={t("parent")}
                value={tName("name", {
                  given_name: form.parent?.given_name,
                  family_name: form.parent?.family_name,
                })}
              />
              <DisplayProperty property={t("event")} value={t(form?.reason)} />
              <DisplayProperty
                property={t("sent_at")}
                value={FormatDateTime(form.sent_at)}
              />
            </div>
            <div className="flex space-y-1.5">
              <CardDescription>{form.additional_message}</CardDescription>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 flex-wrap">
        <Button onClick={changeStatus("reject")} variant="outline">
          {t("decline")}
        </Button>
        <Button onClick={changeStatus("accept")}>{t("accept")}</Button>
      </CardFooter>
    </Card>
  );
}
