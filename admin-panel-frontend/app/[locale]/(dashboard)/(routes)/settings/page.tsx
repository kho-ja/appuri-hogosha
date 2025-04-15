import { NotificationsForm } from "@/components/notifications-form";
import { SchoolNameUpdate } from "@/components/SchoolNameUpdate-form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslations } from "next-intl/server";

export default async function SettingsNotificationsPage() {
  const t = await getTranslations("ThisAdmin");
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>
      <Separator />
      <NotificationsForm />
      <Separator />
      <SchoolNameUpdate />
    </div>
  );
}
