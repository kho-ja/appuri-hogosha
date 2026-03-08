"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const AUTH_ERROR_NAMES = new Set([
  "AuthError",
  "CredentialsSignin",
  "CallbackRouteError",
  "AccessDenied",
  "OTPError",
  "InvalidCredentialsError",
]);

function normalizeAuthActionError(error: unknown) {
  const errorLike =
    typeof error === "object" && error !== null
      ? (error as {
          name?: string;
          message?: string;
          digest?: string;
          type?: string;
        })
      : null;

  if (errorLike?.digest?.startsWith("NEXT_REDIRECT")) {
    throw error;
  }

  const errorName =
    errorLike?.type ||
    errorLike?.name ||
    (error instanceof AuthError ? error.name : "AuthError");

  const errorMessage =
    errorLike?.message ||
    (error instanceof Error ? error.message : "Authentication failed");

  const isAuthError =
    error instanceof AuthError || AUTH_ERROR_NAMES.has(errorName);

  if (!isAuthError) {
    console.error("Unexpected login server action error", error);
  }

  return {
    error: isAuthError ? errorName : "AuthError",
    message: errorMessage,
  };
}

export const login = async (
  email: string,
  password: string,
  newPassword: string
) => {
  try {
    const response = await signIn("credentials", {
      email,
      password,
      newPassword,
      redirect: false,
    });
    
    return response;
  } catch (error) {
    return normalizeAuthActionError(error);
  }
};
