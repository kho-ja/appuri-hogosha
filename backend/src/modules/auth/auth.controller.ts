import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { ExtendedRequest } from '../../middlewares/auth';
import { ApiError } from '../../errors/ApiError';
import { config } from '../../config';

// Allowed frontend base URLs for redirects
const DEFAULT_FRONTEND_URL = config.FRONTEND_URL || 'http://localhost:3000';
const VALID_FRONTEND_URLS: string[] = (
    config.ALLOWED_FRONTEND_URLS
        ? config.ALLOWED_FRONTEND_URLS.split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : [DEFAULT_FRONTEND_URL]
) as string[];

const ALLOWED_FRONTEND_ORIGINS: string[] = VALID_FRONTEND_URLS.map(v => {
    try {
        return new URL(v).origin;
    } catch {
        return '';
    }
}).filter(Boolean);

function getAllowedFrontendBase(state: any): string {
    const defaultBase = DEFAULT_FRONTEND_URL;
    const candidate = Array.isArray(state) ? state[0] : state;
    if (typeof candidate !== 'string' || candidate.length === 0) {
        return defaultBase;
    }

    try {
        const parsed = new URL(candidate, defaultBase);
        if (
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            ALLOWED_FRONTEND_ORIGINS.includes(parsed.origin)
        ) {
            const idx = ALLOWED_FRONTEND_ORIGINS.indexOf(parsed.origin);
            return VALID_FRONTEND_URLS[idx];
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
            const cognitoDomain = config.COGNITO_DOMAIN;
            const clientId = config.ADMIN_CLIENT_ID;
            const callbackUrl = `${config.BACKEND_URL}/admin-panel/google/callback`;
            const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';

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

            const redirectUri = `${config.BACKEND_URL}/admin-panel/google/callback`;
            const result = await this.service.handleGoogleCallback(
                code as string,
                redirectUri
            );

            const base = getAllowedFrontendBase(state);
            const redirectUrlObj = new URL('/', base);
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

            return res.redirect(redirectUrlObj.toString());
        } catch (e: any) {
            console.error('Google callback error:', e);
            const base = getAllowedFrontendBase(req.query.state);
            const url = new URL('/login', base);
            url.searchParams.set('error', 'callback_error');
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
