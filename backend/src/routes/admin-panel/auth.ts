import { IController } from '../../utils/icontroller';
import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import DB from '../../utils/db-client';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';

// Allowed frontend base URLs for redirects (comma-separated env override supported)
const DEFAULT_FRONTEND_URL =
    process.env.FRONTEND_URL || 'http://localhost:3000';
const VALID_FRONTEND_URLS: string[] = (
    process.env.ALLOWED_FRONTEND_URLS
        ? process.env.ALLOWED_FRONTEND_URLS.split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : [DEFAULT_FRONTEND_URL]
) as string[];

// Precompute allowed origins and their canonical bases
const ALLOWED_FRONTEND_ORIGINS: string[] = VALID_FRONTEND_URLS.map(v => {
    try {
        return new URL(v).origin;
    } catch {
        return '';
    }
}).filter(Boolean);

// Resolve a canonical allowed frontend base URL by matching the origin from the provided state.
// If no match, return the default. Never return the raw state string.
function getAllowedFrontendBase(state: any): string {
    const defaultBase = DEFAULT_FRONTEND_URL;
    const candidate = Array.isArray(state) ? state[0] : state;
    if (typeof candidate !== 'string' || candidate.length === 0) {
        return defaultBase;
    }

    try {
        // Use defaultBase as base to support relative candidates without throwing
        const parsed = new URL(candidate, defaultBase);
        if (
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            ALLOWED_FRONTEND_ORIGINS.includes(parsed.origin)
        ) {
            // Return the canonical allowed base that corresponds to this origin
            const idx = ALLOWED_FRONTEND_ORIGINS.indexOf(parsed.origin);
            return VALID_FRONTEND_URLS[idx];
        }
    } catch {
        // ignore and fall back
    }
    return defaultBase;
}

class AuthController implements IController {
    public router: Router = Router();
    public cognitoClient: any;

    // Add rate limiting for admin auth
    private adminLoginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 admin login attempts per windowMs
        message: {
            error: 'Too many admin login attempts from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    private adminAuthLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 admin requests per windowMs
        message: {
            error: 'Too many admin requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    constructor() {
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;
        this.initRoutes();
    }

    initRoutes(): void {
        // Apply rate limiting to admin routes
        this.router.post('/login', this.adminLoginLimiter, this.login);

        // Google OAuth proxy routes
        this.router.get('/google', this.adminAuthLimiter, this.googleLogin);
        this.router.get(
            '/google/callback',
            this.adminAuthLimiter,
            this.googleCallback
        );

        this.router.get('/user-info', this.adminAuthLimiter, this.userInfo);

        this.router.post(
            '/refresh-token',
            this.adminAuthLimiter,
            this.refreshToken
        );
        this.router.post(
            '/change-temp-password',
            this.adminAuthLimiter,
            this.changeTemporaryPassword
        );
        this.router.get(
            '/protected-route',
            this.adminAuthLimiter,
            verifyToken,
            this.protectedRoute
        );
        // Admin forgot password
        this.router.post(
            '/forgot-password-initiate',
            this.adminAuthLimiter,
            this.forgotPasswordInitiate
        );
        this.router.post(
            '/forgot-password-confirm',
            this.adminAuthLimiter,
            this.forgotPasswordConfirm
        );
    }

    forgotPasswordInitiate = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            if (!email) {
                throw { status: 400, message: 'EmailRequired' };
            }

            const admins = await DB.query(
                `SELECT email FROM Admin WHERE email = :email`,
                { email }
            );

            if (admins.length === 0) {
                throw { status: 404, message: 'UserNotFound' };
            }

            let isVerified;
            try {
                isVerified =
                    await this.cognitoClient.checkUserVerificationStatus(email);
            } catch (err) {
                console.error('Failed to check verification status:', err);
                throw { status: 500, message: 'InternalServerError' };
            }

            if (!isVerified.emailVerified) {
                throw { status: 400, message: 'EmailNotVerified' };
            }

            try {
                const result = await this.cognitoClient.forgotPassword(email);
                return res.status(200).json({ message: result.message });
            } catch (err: any) {
                console.error('Cognito forgot password error:', err);

                if (
                    err.status === 400 ||
                    err.status === 401 ||
                    err.status === 429
                ) {
                    throw { status: err.status, message: err.message };
                }

                throw { status: 500, message: 'ForgotPasswordInitiateError' };
            }
        } catch (e: any) {
            console.error('Forgot password initiate error:', e);
            return res
                .status(e.status || 500)
                .json({ error: e.message || 'InternalServerError' });
        }
    };

    forgotPasswordConfirm = async (req: Request, res: Response) => {
        try {
            const { email, verification_code, new_password } = req.body;

            if (!email || !verification_code || !new_password) {
                throw { status: 400, message: 'RequiredFieldsError' };
            }

            try {
                const result = await this.cognitoClient.confirmForgotPassword(
                    email,
                    verification_code,
                    new_password
                );
                return res.status(200).json({ message: result.message });
            } catch (err: any) {
                if (
                    err.status === 400 ||
                    err.status === 401 ||
                    err.status === 404
                ) {
                    throw { status: err.status, message: err.message };
                }
                throw {
                    status: 500,
                    message: err.message || 'InternalServerError',
                };
            }
        } catch (e: any) {
            console.error('Forgot password confirm error (admin):', e);
            return res
                .status(e.status || 500)
                .json({ error: e.message || 'InternalServerError' });
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const authData = await this.cognitoClient.login(email, password);

            const admins = await DB.query(
                `SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`,
                {
                    email: email,
                }
            );

            if (admins.length <= 0) {
                throw {
                    status: 401,
                    message: 'invalid_email_or_password',
                };
            }

            const admin = admins[0];

            try {
                const isFirstTime =
                    await this.cognitoClient.isFirstTimeLogin(email);
                if (isFirstTime) {
                    // Auto-verify email for first-time login
                    await this.cognitoClient.verifyEmail(email);
                    // Email auto-verified
                }
            } catch {
                console.error('Failed to auto-verify admin email');
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: admin.id,
                        email: admin.email,
                        phone_number: admin.phone_number,
                        given_name: admin.given_name,
                        family_name: admin.family_name,
                    },
                    school_name: admin.school_name,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    refreshToken = async (req: Request, res: Response) => {
        try {
            const { refresh_token } = req.body;
            const authData =
                await this.cognitoClient.refreshToken(refresh_token);

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: refresh_token,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    changeTemporaryPassword = async (req: Request, res: Response) => {
        try {
            const { email, temp_password, new_password } = req.body;
            const authData = await this.cognitoClient.changeTempPassword(
                email,
                temp_password,
                new_password
            );

            const admins = await DB.query(
                `SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`,
                {
                    email: email,
                }
            );

            if (admins.length <= 0) {
                throw {
                    status: 401,
                    message: 'invalid_email_or_password',
                };
            }

            const admin = admins[0];

            try {
                // Auto-verify admin email after changing temporary password
                await this.cognitoClient.verifyEmail(email);
                // Email auto-verified
            } catch {
                console.error('Failed to auto-verify admin email');
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: admin.id,
                        email: admin.email,
                        phone_number: admin.phone_number,
                        given_name: admin.given_name,
                        family_name: admin.family_name,
                    },
                    school_name: admin.school_name,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    // Google OAuth Proxy Methods
    googleLogin = async (req: Request, res: Response) => {
        try {
            // Build Cognito Hosted UI URL with Google identity provider
            const cognitoDomain = process.env.COGNITO_DOMAIN; // e.g., https://yourapp-admin.auth.us-east-1.amazoncognito.com
            const clientId = process.env.ADMIN_CLIENT_ID;
            // Use BACKEND_URL env for callback
            const callbackUrl = `${process.env.BACKEND_URL}/admin-panel/google/callback`;

            const frontendUrl =
                process.env.FRONTEND_URL || 'http://localhost:3000';

            if (!cognitoDomain || !clientId || !process.env.BACKEND_URL) {
                throw { status: 500, message: 'Cognito configuration missing' };
            }

            // Construct the Cognito OAuth URL with Google identity provider
            const cognitoUrl =
                `${cognitoDomain}/oauth2/authorize?` +
                `response_type=code&` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                `identity_provider=Google&` +
                `state=${encodeURIComponent(frontendUrl)}`;

            // Redirect user to Cognito Hosted UI with Google
            return res.redirect(cognitoUrl);
        } catch (e: any) {
            console.error('Google login initiation error:', e);
            return res.status(e.status || 500).json({
                error: e.message || 'Failed to initiate Google login',
            });
        }
    };

    googleCallback = async (req: Request, res: Response) => {
        try {
            const { code, state, error } = req.query;

            if (error) {
                console.error('Google OAuth error');
                const base = getAllowedFrontendBase(state);
                const url = new URL('/login', base);
                url.searchParams.set('error', 'oauth_error');
                return res.redirect(url.toString());
            }

            if (!code) {
                throw { status: 400, message: 'Authorization code missing' };
            }

            // Exchange authorization code for tokens with Cognito
            const redirectUri = `${process.env.BACKEND_URL}/admin-panel/google/callback`;
            const tokenResponse = await this.exchangeCodeForTokens(
                code as string,
                redirectUri
            );

            if (!tokenResponse.access_token) {
                throw { status: 400, message: 'Failed to get access token' };
            }

            // Get user info from Cognito using OAuth2 userInfo endpoint
            // Received tokens from Cognito
            const userData = await this.getUserInfo(tokenResponse.access_token);

            // Check if admin exists in database
            const admins = await DB.query(
                `SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`,
                { email: userData.email }
            );

            if (admins.length <= 0) {
                console.error('Admin not found for email');
                const base = getAllowedFrontendBase(state);
                const url = new URL('/login', base);
                url.searchParams.set('error', 'user_not_found');
                return res.redirect(url.toString());
            }

            const admin = admins[0];

            // Do not overwrite cognito_sub_id for Google logins; validate by email.

            // Update last login
            await DB.query(
                'UPDATE Admin SET last_login_at = NOW() WHERE id = :id',
                { id: admin.id }
            );

            // Create a session token or redirect with tokens
            // For simplicity, we'll redirect to frontend with tokens in URL (not recommended for production)
            const base = getAllowedFrontendBase(state);

            // In production, you should:
            // 1. Store tokens in secure HTTP-only cookies, or
            //2. Store in server-side session, or
            // 3. Use a secure token exchange mechanism

            const redirectUrlObj = new URL('/', base);
            redirectUrlObj.searchParams.set(
                'access_token',
                tokenResponse.access_token
            );
            if (tokenResponse.refresh_token) {
                redirectUrlObj.searchParams.set(
                    'refresh_token',
                    tokenResponse.refresh_token
                );
            }
            redirectUrlObj.searchParams.set(
                'user',
                encodeURIComponent(JSON.stringify(admin))
            );
            const redirectUrl = redirectUrlObj.toString();

            // Google login successful, redirecting to frontend
            return res.redirect(redirectUrl);
        } catch {
            console.error('Google callback error');
            const base = getAllowedFrontendBase(req.query.state);
            const url = new URL('/login', base);
            url.searchParams.set('error', 'callback_error');
            return res.redirect(url.toString());
        }
    };

    userInfo = async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw { status: 401, message: 'Access token required' };
            }

            const accessToken = authHeader.split(' ')[1];

            // Get user info from Cognito using OAuth2 userInfo endpoint
            const userData = await this.getUserInfo(accessToken);

            // Get admin details from database
            const admins = await DB.query(
                `SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`,
                { email: userData.email }
            );

            if (admins.length <= 0) {
                throw { status: 404, message: 'Admin not found' };
            }

            const admin = admins[0];

            return res.json({
                user: admin,
                school_name: admin.school_name,
            });
        } catch (e: any) {
            console.error('User info error');
            return res.status(e.status || 500).json({
                error: e.message || 'Failed to get user info',
            });
        }
    };

    private async getUserInfo(accessToken: string) {
        const cognitoDomain = process.env.COGNITO_DOMAIN;
        if (!cognitoDomain) throw new Error('COGNITO_DOMAIN not configured');

        const resp = await fetch(`${cognitoDomain}/oauth2/userInfo`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!resp.ok) {
            console.error('userInfo fetch failed');
            throw { status: 401, message: 'Access token is invalid.' };
        }

        const data = await resp.json();
        return {
            email: data.email as string,
            sub_id: data.sub as string,
            phone_number: (data.phone_number as string) ?? '',
        };
    }

    private async exchangeCodeForTokens(code: string, redirectUri: string) {
        const cognitoDomain = process.env.COGNITO_DOMAIN;
        const clientId = process.env.ADMIN_CLIENT_ID;
        const clientSecret = process.env.ADMIN_CLIENT_SECRET;
        const callbackUrl = redirectUri; // already constructed by caller based on request

        const tokenUrl = `${cognitoDomain}/oauth2/token`;

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId!,
            code: code,
            redirect_uri: callbackUrl,
        });

        // Some Cognito app clients require client_secret for token endpoint
        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (clientSecret) {
            const basic = Buffer.from(`${clientId}:${clientSecret}`).toString(
                'base64'
            );
            headers['Authorization'] = `Basic ${basic}`;
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers,
            body: params.toString(),
        });

        if (!response.ok) {
            console.error('Token exchange failed');
            throw new Error('Failed to exchange code for tokens');
        }

        return await response.json();
    }

    protectedRoute = async (req: ExtendedRequest, res: Response) => {
        return res
            .status(200)
            .json({
                message: 'You have accessed a protected route',
                user: req.user,
            })
            .end();
    };
}

export default AuthController;
