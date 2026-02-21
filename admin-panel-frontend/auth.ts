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
        accessToken: {}, // For OAuth callback
        refreshToken: {}, // For OAuth callback
        userJson: {}, // For OAuth callback - serialized user object
      },
      authorize: async (credentials) => {
        try {
          // Handle OAuth callback scenario
          if (credentials?.accessToken && !credentials?.password) {
            console.log("========== OAUTH AUTHORIZE START ==========");
            // This is an OAuth callback, we already have the tokens
            // Try using userJson first; if missing, get user info using the access token
            const backendUrl =
              process.env.BACKEND_URL || "http://localhost:3001/admin-panel";

            console.log("Backend URL:", backendUrl);
            console.log("Has userJson:", !!credentials.userJson);
            console.log("Has accessToken:", !!credentials.accessToken);

            if (credentials.userJson) {
              console.log("✓ Using userJson from OAuth callback");
              const parsed = JSON.parse(credentials.userJson as string);
              console.log("Parsed user email:", parsed.email);
              console.log("Parsed user given_name:", parsed.given_name);

              // Ensure user has required fields for NextAuth User object
              const user = {
                id: String(parsed.id || parsed.email),
                email: parsed.email,
                name: `${parsed.given_name} ${parsed.family_name}`,
                given_name: parsed.given_name,
                family_name: parsed.family_name,
                phone_number: parsed.phone_number,
                role: parsed.role,
                school_id: parsed.school_id,
                school_name: parsed.school_name || parsed.schoolName,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
              } as any;

              console.log("✓ OAuth user created successfully");
              console.log("========== OAUTH AUTHORIZE END (SUCCESS) ==========");
              return user;
            }

            console.log("⚠ No userJson, fetching from user-info endpoint...");
            const userInfoResponse = await fetch(`${backendUrl}/user-info`, {
              headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                "Content-Type": "application/json",
              },
            });

            console.log("User-info response status:", userInfoResponse.status);

            if (userInfoResponse.ok) {
              const userData = await userInfoResponse.json();
              console.log("✓ User info fetched, email:", userData.user?.email);

              const user = {
                id: String(userData.user?.id),
                email: userData.user?.email,
                name: `${userData.user?.given_name} ${userData.user?.family_name}`,
                given_name: userData.user?.given_name,
                family_name: userData.user?.family_name,
                phone_number: userData.user?.phone_number,
                school_name: userData.school_name,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
              } as any;

              console.log("✓ OAuth user created from user-info");
              console.log("========== OAUTH AUTHORIZE END (SUCCESS) ==========");
              return user;
            } else {
              console.error("❌ User-info endpoint failed with status:", userInfoResponse.status);
              const errorText = await userInfoResponse.text();
              console.error("Error response:", errorText);
              console.log("========== OAUTH AUTHORIZE END (FAILED) ==========");
              return null;
            }
          }

          // Handle normal email/password login
          let authData;
          if (credentials?.newPassword) {
            authData = (await fetch(
              `${process.env.BACKEND_URL}/change-temp-password`,
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
            authData = (await fetch(`${process.env.BACKEND_URL}/login`, {
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
          console.error("========== OAUTH AUTHORIZE ERROR ==========");
          console.error("Error:", e);
          console.error("Error message:", (e as any)?.message);
          console.error("Error stack:", (e as any)?.stack);

          if (e instanceof AuthError) {
            console.error("AuthError detected:", e.message);
            throw e;
          }
          console.log("========== OAUTH AUTHORIZE END (CATCH) ==========");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, session, trigger }) {
      if (user && user?.accessToken) {
        return {
          ...user,
        };
      }

      if (trigger === "update" && session) {
        if (session.schoolName) token.schoolName = session.schoolName;

        return {
          ...token,
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
    const response = await fetch(`${process.env.BACKEND_URL}/refresh-token`, {
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
