import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";
import { apiClient } from "./apiClient";
import { useListQuery } from "./useListQuery";

export default function useApiMutation<TResponse, TInput = void>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  mutationKey: unknown[],
  options: MutationOptions<TResponse, HttpError, TInput, unknown> = {}
) {
  const { data: session } = useSession();
  const t = useTranslations("errors");

  return useMutation<TResponse, HttpError, TInput>({
    mutationKey,
    mutationFn: (data: TInput) =>
      apiClient<TResponse>({
        endpoint,
        method,
        token: session?.sessionToken,
        body: data,
      }),
    onMutate: () => {
      toast({
        title: t("loading"),
        description: t("loadingDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("wentWrong"),
        description: t(error.message),
        variant: "destructive",
      });
    },
    ...options,
  });
}
