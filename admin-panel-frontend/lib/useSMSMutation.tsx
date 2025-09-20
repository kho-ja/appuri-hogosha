import useApiMutation from './useApiMutation';
import { MutationOptions } from '@tanstack/react-query';
import HttpError from './HttpError';

export default function useSMSMutation<T>(
  smsId: number | null,
  method: string,
  options: MutationOptions<T, HttpError, any, unknown> = {}
) {
  return useApiMutation<T>(`sms/${smsId}`, method, ['sms'], options);
}
