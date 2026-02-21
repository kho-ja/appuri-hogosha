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
        keyGenerator: (req: Request) => {
            // For AWS Lambda behind ALB/Cloudfront, get IP from headers
            const forwarded = req.headers['x-forwarded-for'];
            if (typeof forwarded === 'string') {
                return forwarded.split(',')[0].trim();
            }
            return req.socket.remoteAddress || 'unknown';
        },
    });

    private adminAuthLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20,
        message: {
            error: 'Too many admin requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
            // For AWS Lambda behind ALB/Cloudfront, get IP from headers
            const forwarded = req.headers['x-forwarded-for'];
            if (typeof forwarded === 'string') {
                return forwarded.split(',')[0].trim();
            }
            return req.socket.remoteAddress || 'unknown';
        },
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
            const cognitoDomain = config.COGNITO_DOMAIN;
            const clientId = config.ADMIN_CLIENT_ID;
            const callbackUrl = `${config.BACKEND_URL}/admin-panel/google/callback`;
            const frontendUrl = config.FRONTEND_URL;

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
                `state=${encodeURIComponent(frontendUrl)}`;

            return res.redirect(cognitoUrl);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    googleCallback = async (req: Request, res: Response) => {
        try {
            const { code, state, error } = req.query;

            console.log("FRONTEND_URL:", config.FRONTEND_URL);
            console.log("ALLOWED_FRONTEND_URLS:", config.ALLOWED_FRONTEND_URLS);
            console.log("STATE:", state);

            if (error) {
                console.error('Google OAuth error:', error);
                const base = getAllowedFrontendBase(state);
                const url = new URL('/login', base);
                url.searchParams.set('error', 'oauth_error');
                return res.redirect(url.toString());
            }

            if (!code) {
                console.error('Authorization code missing');
                throw { status: 400, message: 'Authorization code missing' };
            }

            console.log('Processing authorization code:', code);
            const redirectUri = `${config.BACKEND_URL}/admin-panel/google/callback`;
            console.log('Redirect URI:', redirectUri);

            const result = await this.service.handleGoogleCallback(
                code as string,
                redirectUri
            );

            console.log('Google callback result received:', {
                adminEmail: result.admin?.email,
                hasAccessToken: !!result.accessToken,
                hasRefreshToken: !!result.refreshToken,
            });

            const base = getAllowedFrontendBase(state);
            const redirectUrlObj = new URL('/', base);
            redirectUrlObj.searchParams.set('access_token', result.accessToken);
            if (result.refreshToken) {
                redirectUrlObj.searchParams.set(
                    'refresh_token',
                    result.refreshToken
                );
            }

            const userJson = JSON.stringify(result.admin);
            console.log('Encoded user data length:', userJson.length);
            redirectUrlObj.searchParams.set('user', encodeURIComponent(userJson));

            const finalUrl = redirectUrlObj.toString();
            console.log('Redirecting to:', finalUrl.substring(0, 100) + '...');

            return res.redirect(finalUrl);
        } catch (e: any) {
            console.error('Google callback error:', {
                name: e?.name,
                message: e?.message,
                code: e?.code,
                status: e?.status,
                stack: e?.stack,
            });
            const base = getAllowedFrontendBase(req.query.state);
            const url = new URL('/login', base);
            url.searchParams.set('error', 'callback_error');
            console.log('Redirecting to error URL:', url.toString());
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
