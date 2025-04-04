import { NotificationsForm } from "@/components/notifications-form";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function SettingsNotificationsPage() {

  const t = useTranslations("NotificationsForm");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("SettingsTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("SettingsDescription")}</p>
      </div>
      <Separator />
      <NotificationsForm />
    </div>
  );
}
