import NextAuth, { AuthError } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

class OTPError extends AuthError {
  error;
  constructor(message: string, error: { error: string; status: number }) {
    super(message);
    this.name = 'OTPError';
    this.error = error;
  }
}

class InvalidCredentialsError extends AuthError {
  error;
  constructor(message: string, error: { error: string; status: number }) {
    super(message);
    this.name = 'InvalidCredentialsError';
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
        newPassword: { type: 'password' },
        accessToken: {}, // For OAuth callback
        refreshToken: {}, // For OAuth callback
        userJson: {}, // For OAuth callback - serialized user object
      },
      authorize: async credentials => {
        try {
          // Handle OAuth callback scenario
          if (credentials?.accessToken && !credentials?.password) {
            // This is an OAuth callback, we already have the tokens
            // Try using userJson first; if missing, get user info using the access token
            const backendUrl =
              process.env.BACKEND_URL || 'http://localhost:3001/admin-panel';
            if (credentials.userJson) {
              const parsed = JSON.parse(credentials.userJson as string);
              return {
                ...parsed,
                given_name: parsed.given_name,
                family_name: parsed.family_name,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
                schoolName: parsed.school_name ?? parsed.schoolName,
              } as any;
            }

            const userInfoResponse = await fetch(`${backendUrl}/user-info`, {
              headers: {
                Authorization: `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (userInfoResponse.ok) {
              const userData = await userInfoResponse.json();
              return {
                ...userData.user,
                given_name: userData.user.given_name,
                family_name: userData.user.family_name,
                refreshToken: credentials.refreshToken,
                accessToken: credentials.accessToken,
                accessTokenExpires: Date.now() + 60 * 60 * 24 * 1000,
                schoolName: userData.school_name,
              };
            } else {
              console.error('Failed to get user info with access token');
              return null;
            }
          }

          // Handle normal email/password login
          let authData;
          if (credentials?.newPassword) {
            authData = (await fetch(
              `${process.env.BACKEND_URL}/change-temp-password`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: credentials.email,
                  temp_password: credentials.password,
                  new_password: credentials.newPassword,
                }),
              }
            )) as Response;
          } else {
            authData = (await fetch(`${process.env.BACKEND_URL}/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials),
            })) as Response;
          }

          const status = authData.status;

          authData = await authData.json();

          if (authData?.error && status === 403) {
            throw new OTPError('OTPError', {
              error: authData?.error,
              status: status,
            });
          }

          if (authData?.error && status === 401) {
            throw new InvalidCredentialsError('InvalidCredentialsError', {
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
    jwt({ token, user, session, trigger }) {
      if (user && user?.accessToken) {
        return {
          ...user,
        };
      }

      if (trigger === 'update' && session) {
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
      session.error = (token?.error ?? '') as string;

      session.user.given_name = token?.given_name as string;
      session.user.family_name = token?.family_name as string;
      session.user.role = token?.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/refresh-token`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
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
      error: '',
    };
  } catch (error) {
    console.error(error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
