import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import HttpError from "./HttpError";
import { apiClient } from "./apiClient";

export function useListQuery<T>(
  endpoint: string,
  queryKey: unknown[],
  params?: Record<string, unknown>,
  method: "GET" | "POST" = "GET",
  options?: { enabled?: boolean }
) {
  const { data: session } = useSession();

  return useQuery<T, HttpError>({
    queryKey,
    queryFn: async () => {
      return apiClient<T>({
        endpoint,
        method,
        token: session?.sessionToken,
        ...(method === "GET" ? { params } : { body: params }),
      });
    },
    enabled: !!session?.sessionToken && (options?.enabled ?? true),
  });
}

