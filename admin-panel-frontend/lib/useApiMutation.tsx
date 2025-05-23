import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";

export default function useApiMutation<TResponse, TInput = void>(
  mutationUrl: string,
  method: string,
  mutationKey: unknown[],
  options: MutationOptions<TResponse, HttpError, TInput, unknown> = {}
) {
  const { data: session } = useSession();
  const t = useTranslations("errors");

  return useMutation<TResponse, HttpError, TInput>({
    mutationKey,
    mutationFn: async (data: TInput): Promise<TResponse> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/${mutationUrl}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new HttpError(error.error, res.status, error);
      }
      return res.json() as TResponse;
    },
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
  