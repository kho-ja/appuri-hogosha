import { NextResponse } from "next/server";
import { signIn } from "@/auth";

function resolveBaseUrl(req: Request): string {
  const envBase =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL;

  if (envBase) return envBase;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

function parseUserParam(userParam: string) {
  try {
    return JSON.parse(decodeURIComponent(userParam));
  } catch {
    return JSON.parse(userParam);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = resolveBaseUrl(req);

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  if (!accessToken || !userParam) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", baseUrl)
    );
  }

  try {
    const userData = parseUserParam(userParam);

    return await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: "/dashboard",
    });
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=oauth_processing_failed", baseUrl)
    );
  }
}