import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  console.log("========== OAUTH COMPLETE ROUTE START ==========");
  console.log("Request URL:", req.url);
  console.log("Origin:", origin);
  console.log("Access Token:", accessToken ? "exists" : "MISSING ❌");
  console.log("Refresh Token:", refreshToken ? "exists" : "N/A");
  console.log("User Param:", userParam ? "exists" : "MISSING ❌");

  if (!accessToken || !userParam) {
    console.error("❌ Missing required parameters");
    const errorUrl = new URL("/login?error=oauth_missing_params", origin);
    console.log("Redirecting to:", errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  }

  try {
    console.log("Parsing user data...");
    const userData = JSON.parse(decodeURIComponent(userParam));
    console.log("✓ User data parsed. Email:", userData.email);

    if (!userData.email) {
      console.error("❌ User data missing email");
      return NextResponse.redirect(
        new URL("/login?error=invalid_user_data", origin)
      );
    }

    // SignIn with OAuth credentials
    console.log("Calling signIn with credentials provider...");
    const result = await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirect: false,
    });

    console.log("SignIn result:", {
      success: result && !result.error,
      error: result?.error,
      ok: result?.ok,
      status: result?.status,
    });

    // signIn returns the user object if successful, or null/error if failed
    if (result && !result.error) {
      console.log("✓ SignIn successful, redirecting to dashboard");
      console.log("========== OAUTH COMPLETE ROUTE END (SUCCESS) ==========");
      return NextResponse.redirect(new URL("/dashboard", origin));
    } else {
      console.error("❌ SignIn failed with error:", result?.error);
      console.log("========== OAUTH COMPLETE ROUTE END (SIGNIN FAILED) ==========");
      return NextResponse.redirect(
        new URL(`/login?error=oauth_signin_failed`, origin)
      );
    }
  } catch (error) {
    console.error("========== OAUTH COMPLETE ROUTE ERROR ==========");
    console.error("Error:", error);
    console.error("Error message:", (error as Error)?.message);
    console.error("Error stack:", (error as Error)?.stack);
    return NextResponse.redirect(
      new URL("/login?error=oauth_processing_failed", origin)
    );
  }
}
