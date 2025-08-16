import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import HttpError from "./HttpError";

export default function useApiPostQuery<T, TInput = any>(
  queryUrl: string,
  queryKey: unknown[],
  postData: TInput
) {
  const { data: session } = useSession();
  return useQuery<T, HttpError>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/${queryUrl}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.sessionToken}`,
          },
          body: JSON.stringify(postData),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new HttpError(data.error, res.status, data);
      }
      return (await res.json()) as T;
    },
    enabled: !!session?.sessionToken,
    retry: 1,
  });
}
