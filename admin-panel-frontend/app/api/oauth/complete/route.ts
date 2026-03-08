import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { routing } from "@/i18n/routing";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  // Default to 'uz' locale for redirects
  const locale = "uz";

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

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
  } catch (error: unknown) {
    // Auth.js may throw framework redirect-like errors to complete navigation.
    // Re-throw them so successful sign-in is not converted into oauth_processing_failed.
    const err = error as { digest?: string; message?: string };
    const digest = typeof err?.digest === "string" ? err.digest : "";
    const message = typeof err?.message === "string" ? err.message : "";
    if (digest.startsWith("NEXT_REDIRECT") || message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("OAuth complete processing failed", {
      digest: err?.digest,
      message: err?.message,
    });
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=oauth_processing_failed`, origin)
    );
  }
}
