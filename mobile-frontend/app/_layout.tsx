import React from 'react';
import { setupNotificationHandler } from '@/utils/notifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { AppProviders } from '@/providers/AppProviders';

// Set up the notification handler BEFORE the app starts
setupNotificationHandler();

export default function Root() {
  const { isDeepLinkNavigating } = useDeepLinking();

  return <AppProviders isDeepLinkNavigating={isDeepLinkNavigating} />;
}
