import { NextResponse } from "next/server";
import { signIn } from "@/auth";

// ✅ Node.js runtime ga majburlaymiz, Edge-da log chiqmaydi
export const runtime = "nodejs";

export async function GET(req: Request) {
  // ===== DEBUG LOGS START =====
  console.error("========= OAUTH CALLBACK DEBUG ========="); // console.error ishlatiladi, CloudWatch-da aniq chiqadi
  console.error("FULL URL:", req.url);

  console.error("HOST:", req.headers.get("host"));
  console.error("X-Forwarded-Host:", req.headers.get("x-forwarded-host"));
  console.error("X-Forwarded-Proto:", req.headers.get("x-forwarded-proto"));
  console.error("Origin header:", req.headers.get("origin"));
  console.error("========================================");
  // ===== DEBUG LOGS END =====

  const url = new URL(req.url);
  const origin = url.origin;

  console.error("URL origin from new URL():", origin);

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token") || "";
  const userParam = url.searchParams.get("user");
  const locale = url.searchParams.get("locale") || "uz";

  console.error("Access token exists:", !!accessToken);
  console.error("User param exists:", !!userParam);
  console.error("Locale:", locale);

  if (!accessToken || !userParam) {
    console.error("❌ Missing params - redirecting to login");

    // 🔹 Log flush qilish uchun kichik delay
    await new Promise((resolve) => setTimeout(resolve, 5));

    const loginUrl = locale === "uz" ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(
      new URL(`${loginUrl}?error=oauth_missing_params`, origin)
    );
  }

  try {
    console.error("Raw userParam:", userParam);
    const userData = JSON.parse(userParam);

    if (!userData) {
      throw new Error("User data is null or undefined");
    }

    console.error("✅ User parsed successfully:", userData.email);

    const dashboardPath = locale === "uz" ? "/dashboard" : `/${locale}/dashboard`;
    return await signIn("credentials", {
      email: userData.email,
      accessToken,
      refreshToken,
      userJson: JSON.stringify(userData),
      redirectTo: dashboardPath,
    });
  } catch (error) {
    console.error("❌ JSON PARSE ERROR:", error);
    console.error("❌ Redirecting to login with processing error");

    // 🔹 Log flush
    await new Promise((resolve) => setTimeout(resolve, 5));

    const loginUrl = locale === "uz" ? "/login" : `/${locale}/login`;
    return NextResponse.redirect(
      new URL(`${loginUrl}?error=oauth_processing_failed`, origin)
    );
  }
}