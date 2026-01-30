import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";
import { apiClient } from "./apiClient";
import { useListQuery } from "./useListQuery";
import useApiErrorHandler from "./useApiErrorHandler";

export default function useApiMutation<TResponse, TInput = void>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  mutationKey: unknown[],
  options: MutationOptions<TResponse, HttpError, TInput, unknown> = {}
) {
  const { data: session } = useSession();
  const t = useTranslations("errors");
  const handleError = useApiErrorHandler();

  // Extract custom onError if provided
  const {
    onError: customOnError,
    onMutate: customOnMutate,
    ...restOptions
  } = options;

  return useMutation<TResponse, HttpError, TInput>({
    mutationKey,
    mutationFn: (data: TInput) =>
      apiClient<TResponse>({
        endpoint,
        method,
        token: session?.sessionToken,
        body: data,
      }),
    onMutate: (variables) => {
      // Show loading toast unless custom onMutate is provided
      if (!customOnMutate) {
        toast({
          title: t("loading"),
          description: t("loadingDescription"),
        });
      } else {
        // Call custom onMutate if provided
        customOnMutate(variables);
      }
    },
    onError: (error, variables, context) => {
      // Use centralized error handler unless custom onError is provided
      if (!customOnError) {
        handleError(error);
      } else {
        // Call custom onError if provided
        customOnError(error, variables, context);
      }
    },
    ...restOptions,
  });
}
