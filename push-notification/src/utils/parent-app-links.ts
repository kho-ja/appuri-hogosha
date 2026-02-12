import { ENVIRONMENT } from '../config/environment';

const normalizeBaseUrl = (baseUrl: string): string =>
    baseUrl.replace(/\/+$/, '');

export const getParentAppBaseUrl = (): string =>
    normalizeBaseUrl(ENVIRONMENT.PARENT_APP_BASE_URL);

export const buildParentNotificationRootUrl = (): string =>
    `${getParentAppBaseUrl()}/parentnotification`;

export const buildParentNotificationMessageUrl = (
    studentId: string | number,
    messageId: string | number
): string =>
    `${buildParentNotificationRootUrl()}/student/${studentId}/message/${messageId}`;
