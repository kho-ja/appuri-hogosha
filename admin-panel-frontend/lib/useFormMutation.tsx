import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";
import useApiErrorHandler from "./useApiErrorHandler";

export default function useFormMutation<T>(
  mutationUrl: string,
  method: string,
  mutationKey: unknown[],
  options: MutationOptions<T, HttpError, FormData> = {}
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

  return useMutation<T, HttpError, FormData>({
    mutationKey,
    async mutationFn(formData: FormData) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/${mutationUrl}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: formData,
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new HttpError(error.error, res.status, error);
      }
      return res.json() as T;
    },
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
