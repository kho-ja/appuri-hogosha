import { toast } from "@/components/ui/use-toast";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import HttpError from "./HttpError";

export default function useFileMutation<T>(
  mutationUrl: string,
  mutationKey: unknown[],
  options: MutationOptions<T, HttpError> = {}
) {
  const { data: session } = useSession();
  const t = useTranslations("errors");

  return useMutation<T, HttpError>({
    mutationKey,
    async mutationFn() {
      if (!session?.sessionToken) throw new HttpError("Unauthorized");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/${mutationUrl}`,
        {
          headers: {
            Authorization: `Bearer ${session?.sessionToken}`,
          },
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new HttpError(error.error, res.status, error);
      }

      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      return blob as T;
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
    onSuccess: () => {
      toast({
        title: t("fileDownloaded"),
        description: t("fileDownloadedDescription"),
      });
    },
    ...options,
  });
}
