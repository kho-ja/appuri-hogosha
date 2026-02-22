import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
  const url = new URL(req.url, origin);
  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  console.log("========== OAUTH COMPLETE ROUTE START ==========");
  console.log("Calculated Origin:", origin);
  console.log("Access Token:", accessToken ? "exists" : "MISSING ❌");
  console.log("User Param:", userParam ? "exists" : "MISSING ❌");

  if (!accessToken || !userParam) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", origin)
    );
  }

  try {
    console.log("Parsing user data...");
    const userData = JSON.parse(decodeURIComponent(userParam));
    console.log("✓ User data parsed. Email:", userData.email);

    await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: "/dashboard",
    });

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("AuthError detected:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=oauth_processing_failed", origin)
      );
    }

    throw error;
  }
}
