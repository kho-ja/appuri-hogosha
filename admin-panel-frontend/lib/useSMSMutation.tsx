import useApiMutation from "./useApiMutation";
import { MutationOptions } from "@tanstack/react-query";
import HttpError from "./HttpError";

export default function useSMSMutation<T>(
  smsId: number | null,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  options: MutationOptions<T, HttpError, void, unknown> = {}
) {
  return useApiMutation<T>(`sms/${smsId}`, method, ["sms"], options);
}
