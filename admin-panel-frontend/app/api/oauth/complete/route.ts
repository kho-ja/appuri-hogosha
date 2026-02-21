import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  if (!accessToken || !userParam) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", origin)
    );
  }

  try {
    const userData = JSON.parse(decodeURIComponent(userParam));

    if (!userData.email) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_user_data", origin)
      );
    }

    // SignIn with OAuth credentials
    const result = await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirect: false,
    });

    // signIn returns the user object if successful, or null/error if failed
    if (result && !result.error) {
      return NextResponse.redirect(new URL("/dashboard", origin));
    } else {
      return NextResponse.redirect(
        new URL(`/login?error=oauth_signin_failed`, origin)
      );
    }
  } catch (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_processing_failed", origin)
    );
  }
}
