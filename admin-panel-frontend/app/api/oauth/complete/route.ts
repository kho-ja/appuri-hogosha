import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");
  const locale = url.searchParams.get("locale") || "uz";

  if (!accessToken || !userParam) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_missing_params`, origin)
    );
  }

  try {
    const userData = JSON.parse(decodeURIComponent(userParam));

    // Use server-side NextAuth signIn to set session and redirect to dashboard
    return await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: `/${locale}/dashboard`,
    });
  } catch {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_processing_failed`, origin)
    );
  }
}
