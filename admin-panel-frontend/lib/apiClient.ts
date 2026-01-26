import HttpError from "./HttpError";

type ApiClientOptions = {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  params?: Record<string, unknown>;
  body?: unknown;
};

export async function apiClient<T>({
  endpoint,
  method = "GET",
  token,
  params,
  body,
}: ApiClientOptions): Promise<T> {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/${endpoint}`
  );

  if (params && method === "GET") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: method !== "GET" && body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new HttpError(errorData.error, res.status, errorData);
  }

  return res.json() as Promise<T>;
}
