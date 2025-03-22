"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

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
    if (error instanceof AuthError) {
      return { ...error, error: error.name, message: error.message };
    }
    throw error;
  }
};
