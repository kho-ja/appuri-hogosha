import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  console.log("OAuth callback received with params:", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasUserParam: !!userParam,
    userParamLength: userParam?.length,
  });

  if (!accessToken || !userParam) {
    console.error("Missing OAuth parameters:", {
      accessToken,
      userParam,
    });
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", origin)
    );
  }

  try {
    console.log("Attempting to parse user parameter...");
    const userData = JSON.parse(decodeURIComponent(userParam));

    console.log("User data parsed successfully:", {
      email: userData.email,
      given_name: userData.given_name,
    });

    // Use server-side NextAuth signIn to set session and redirect to dashboard
    const result = await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: "/dashboard",
    });

    console.log("SignIn result:", result);
    return result;
  } catch (error) {
    console.error("OAuth processing error:", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.redirect(
      new URL("/login?error=oauth_processing_failed", origin)
    );
  }
}
