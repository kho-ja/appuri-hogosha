import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { ExtendedRequest } from '../../middlewares/auth';
import { ApiError } from '../../errors/ApiError';
import { config } from '../../config';

// Allowed frontend base URLs for redirects - read at runtime to ensure env vars are fresh
function getDefaultFrontendUrl(): string {
    return config.FRONTEND_URL || 'http://localhost:3000';
}

function getValidFrontendUrls(): string[] {
    return config.ALLOWED_FRONTEND_URLS
        ? config.ALLOWED_FRONTEND_URLS.split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : [getDefaultFrontendUrl()];
}

function getAllowedFrontendOrigins(): string[] {
    return getValidFrontendUrls()
        .map(v => {
            try {
                return new URL(v).origin;
            } catch {
                return '';
            }
        })
        .filter(Boolean);
}

function getAllowedFrontendBase(state: any): string {
    const defaultBase = getDefaultFrontendUrl();
    const validFrontendUrls = getValidFrontendUrls();
    const allowedOrigins = getAllowedFrontendOrigins();

    const candidate = Array.isArray(state) ? state[0] : state;
    if (typeof candidate !== 'string' || candidate.length === 0) {
        return defaultBase;
    }

    try {
        const parsed = new URL(candidate, defaultBase);
        if (
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            allowedOrigins.includes(parsed.origin)
        ) {
            const idx = allowedOrigins.indexOf(parsed.origin);
            return validFrontendUrls[idx];
        }
    } catch {
        // ignore and fall back
    }
    return defaultBase;
}

export class AuthController {
    public router: Router = Router();

    private adminLoginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: {
            error: 'Too many admin login attempts from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    private adminAuthLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        message: {
            error: 'Too many admin requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    constructor(private service: AuthService) {
        this.initRoutes();
    }

    private initRoutes(): void {
        // Import verifyToken middleware locally to avoid circular dependency
        const { verifyToken } = require('../../middlewares/auth');

        this.router.post('/login', this.adminLoginLimiter, this.login);
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

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.login(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.refreshToken(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    changeTemporaryPassword = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.service.changeTemporaryPassword(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    forgotPasswordInitiate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.service.forgotPasswordInitiate(req.body);
            return res.status(200).json(result);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    forgotPasswordConfirm = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.service.forgotPasswordConfirm(req.body);
            return res.status(200).json(result);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    googleLogin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("========== GOOGLE LOGIN START ==========");
            const cognitoDomain = config.COGNITO_DOMAIN;
            const clientId = config.ADMIN_CLIENT_ID;
            const callbackUrl = `${config.BACKEND_URL}/admin-panel/google/callback`;
            const frontendUrl = config.FRONTEND_URL;
            const encodedState = encodeURIComponent(frontendUrl);   
            console.log("🔧 Configuration:");
            console.log("  COGNITO_DOMAIN:", cognitoDomain);
            console.log("  CLIENT_ID:", clientId);
            console.log("  BACKEND_URL:", config.BACKEND_URL);
            console.log("  CALLBACK_URL:", callbackUrl);
            console.log("  FRONTEND_URL:", frontendUrl);
            console.log("");
            console.log("⚠️  IMPORTANT: This callback URL must be whitelisted in Cognito:");
            console.log("  👉", callbackUrl);

            if (!cognitoDomain || !clientId || !config.BACKEND_URL) {
                throw new ApiError(500, 'Cognito configuration missing');
            }

            const cognitoUrl =
                `${cognitoDomain}/oauth2/authorize?` +
                `response_type=code&` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                `identity_provider=Google&` +
                `prompt=select_account&` +
                `state=${encodedState}`;

            console.log("✓ Redirecting to Cognito URL");
            console.log("========== GOOGLE LOGIN END ==========");
            return res.redirect(cognitoUrl);
        } catch (e: any) {
            console.error("========== GOOGLE LOGIN ERROR ==========");
            console.error("Error:", e);
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    googleCallback = async (req: Request, res: Response) => {
        try {
            const { code, state, error } = req.query;

            console.log("========== GOOGLE CALLBACK START ==========");
            console.log("BACKEND_URL:", config.BACKEND_URL);
            console.log("FRONTEND_URL:", config.FRONTEND_URL);
            console.log("ALLOWED_FRONTEND_URLS:", config.ALLOWED_FRONTEND_URLS);
            console.log("STATE:", state);
            console.log("CODE:", code ? 'exists' : 'missing');
            console.log("ERROR:", error);

            if (error) {
                console.error('❌ Google OAuth error from Cognito:', error);
                const base = getAllowedFrontendBase(state);
                console.log("Redirecting to login with error. Base:", base);
                const url = new URL('/login', base);
                url.searchParams.set('error', 'oauth_error');
                console.log("Final redirect URL:", url.toString());
                return res.redirect(url.toString());
            }

            if (!code) {
                console.error('❌ Authorization code missing');
                throw { status: 400, message: 'Authorization code missing' };
            }

            console.log("✓ Authorization code received, calling backend service...");
            const redirectUri = `${config.BACKEND_URL}/admin-panel/google/callback`;
            const result = await this.service.handleGoogleCallback(
                code as string,
                redirectUri
            );

            console.log("✓ Google callback service successful");
            console.log("Admin email:", result.admin?.email);

            const base = getAllowedFrontendBase(state);
            // FIX: Redirect to /api/oauth/complete instead of root path
            const redirectUrlObj = new URL('/api/oauth/complete', base);
            redirectUrlObj.searchParams.set('access_token', result.accessToken);
            if (result.refreshToken) {
                redirectUrlObj.searchParams.set(
                    'refresh_token',
                    result.refreshToken
                );
            }
            redirectUrlObj.searchParams.set(
                'user',
                encodeURIComponent(JSON.stringify(result.admin))
            );

            console.log("✓ Redirecting to frontend complete endpoint");
            console.log("Final redirect URL:", redirectUrlObj.toString());
            console.log("========== GOOGLE CALLBACK END ==========");
            return res.redirect(redirectUrlObj.toString());
        } catch (e: any) {
            console.error('========== GOOGLE CALLBACK ERROR ==========');
            console.error('Error details:', e);
            console.error('Error message:', e?.message);
            console.error('Error status:', e?.status);
            const base = getAllowedFrontendBase(req.query.state);
            const url = new URL('/login', base);
            url.searchParams.set('error', 'callback_error');
            console.error('Redirecting to error page:', url.toString());
            return res.redirect(url.toString());
        }
    };

    userInfo = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new ApiError(401, 'Access token required');
            }

            const accessToken = authHeader.split(' ')[1];
            const result =
                await this.service.getUserInfoByAccessToken(accessToken);

            return res.json(result);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

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
