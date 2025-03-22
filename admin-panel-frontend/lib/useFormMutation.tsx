import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";

export default function useFormMutation<T>(
  mutationUrl: string,
  method: string,
  mutationKey: unknown[],
  options: MutationOptions<T, HttpError, any> = {}
) {
  const { data: session } = useSession();
  const t = useTranslations("errors");

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
    onMutate: () => {
      toast({
        title: t("loading"),
        description: t("loadingDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("wentWrong"),
        description: error.message,
        variant: "destructive",
      });
    },
    ...options,
  });
}
