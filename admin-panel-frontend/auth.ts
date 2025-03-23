import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";

class OTPError extends AuthError {
  error;
  constructor(message: string, error: { error: string; status: number }) {
    super(message);
    this.name = "OTPError";
    this.error = error;
  }
}

class InvalidCredentialsError extends AuthError {
  error;
  constructor(message: string, error: { error: string; status: number }) {
    super(message);
    this.name = "InvalidCredentialsError";
    this.error = error;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
        newPassword: { type: "password" },
      },
      authorize: async (credentials) => {
        try {
          let authData;
          if (credentials?.newPassword) {
            authData = (await fetch(
              process.env.BACKEND_URL + "/change-temp-password",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: credentials.email,
                  temp_password: credentials.password,
                  new_password: credentials.newPassword,
                }),
              }
            )) as Response;
          } else {
            authData = (await fetch(process.env.BACKEND_URL + "/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials),
            })) as Response;
          }

          const status = authData.status;

          authData = await authData.json();

          if (authData?.error && status === 403) {
            throw new OTPError("OTPError", {
              error: authData?.error,
              status: status,
            });
          }

          if (authData?.error && status === 401) {
            throw new InvalidCredentialsError("InvalidCredentialsError", {
              error: authData?.error,
              status: status,
            });
          }

          if (authData) {
            return {
              ...authData?.user,
              given_name: authData?.user.given_name,
              family_name: authData?.user.family_name,
              refreshToken: authData?.refresh_token,
              accessToken: authData?.access_token,
              accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
              schoolName: authData?.school_name,
            };
          }

          return null;
        } catch (e) {
          if (e instanceof AuthError) {
            throw e;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: { token: any; user: any }) {
      if (user && user?.accessToken) {
        return {
          accessToken: user?.accessToken,
          accessTokenExpires: Date.now() + user?.accessTokenExpires * 1000,
          ...user,
        };
      }

      if (Date.now() < token?.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      session.sessionToken = token?.accessToken as string;
      session.expires = new Date(token?.accessTokenExpires as number) as Date &
        string;
      session.schoolName = token?.schoolName as string;
      session.error = (token?.error ?? "") as string;

      session.user.given_name = token?.given_name as string;
      session.user.family_name = token?.family_name as string;
      session.user.role = token?.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(process.env.BACKEND_URL + "/refresh-token", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      error: "",
    };
  } catch (error) {
    console.error(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
