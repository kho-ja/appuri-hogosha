import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(req: Request) {
  // ===== DEBUG LOGS START =====
  console.log("========= OAUTH CALLBACK DEBUG =========");
  console.log("FULL URL:", req.url);

  console.log("HOST:", req.headers.get("host"));
  console.log("X-Forwarded-Host:", req.headers.get("x-forwarded-host"));
  console.log("X-Forwarded-Proto:", req.headers.get("x-forwarded-proto"));
  console.log("Origin header:", req.headers.get("origin"));
  console.log("========================================");
  // ===== DEBUG LOGS END =====

  const url = new URL(req.url);

  console.log("URL origin from new URL():", url.origin);

  const origin = url.origin;

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");

  console.log("Access token exists:", !!accessToken);
  console.log("User param exists:", !!userParam);

  if (!accessToken || !userParam) {
    console.log("❌ Missing params - redirecting to login");
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", origin)
    );
  }

  try {
    const userData = JSON.parse(decodeURIComponent(userParam));

    console.log("✅ User parsed successfully:", userData.email);

    return await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.log("❌ JSON PARSE ERROR:", error);
    console.log("❌ Redirecting to login with processing error");

    return NextResponse.redirect(
      new URL("/login?error=oauth_processing_failed", origin)
    );
  }
}