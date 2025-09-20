import { NotificationsForm } from '@/components/notifications-form';
import { SchoolNameUpdate } from '@/components/SchoolNameUpdate-form';
import { Separator } from '@/components/ui/separator';
import { getTranslations } from 'next-intl/server';

export default async function SettingsNotificationsPage() {
  const t = await getTranslations('NotificationsForm');
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('SettingsTitle')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('SettingsDescription')}
        </p>
      </div>
      <Separator />
      <NotificationsForm />
      <Separator />
      <SchoolNameUpdate />
    </div>
  );
}
