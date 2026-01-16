import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { ExtendedRequest } from '../../middlewares/auth';

// Allowed frontend base URLs for redirects
const DEFAULT_FRONTEND_URL =
    process.env.FRONTEND_URL || 'http://localhost:3000';
const VALID_FRONTEND_URLS: string[] = (
    process.env.ALLOWED_FRONTEND_URLS
        ? process.env.ALLOWED_FRONTEND_URLS.split(',')
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

    login = async (req: Request, res: Response) => {
        try {
            const result = await this.service.login(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    refreshToken = async (req: Request, res: Response) => {
        try {
            const result = await this.service.refreshToken(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    changeTemporaryPassword = async (req: Request, res: Response) => {
        try {
            const result = await this.service.changeTemporaryPassword(req.body);
            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    forgotPasswordInitiate = async (req: Request, res: Response) => {
        try {
            const result = await this.service.forgotPasswordInitiate(req.body);
            return res.status(200).json(result);
        } catch (e: any) {
            console.error('Forgot password initiate error:', e);
            return res
                .status(e.status || 500)
                .json({ error: e.message || 'InternalServerError' });
        }
    };

    forgotPasswordConfirm = async (req: Request, res: Response) => {
        try {
            const result = await this.service.forgotPasswordConfirm(req.body);
            return res.status(200).json(result);
        } catch (e: any) {
            console.error('Forgot password confirm error (admin):', e);
            return res
                .status(e.status || 500)
                .json({ error: e.message || 'InternalServerError' });
        }
    };

    googleLogin = async (req: Request, res: Response) => {
        try {
            const cognitoDomain = process.env.COGNITO_DOMAIN;
            const clientId = process.env.ADMIN_CLIENT_ID;
            const callbackUrl = `${process.env.BACKEND_URL}/admin-panel/google/callback`;
            const frontendUrl =
                process.env.FRONTEND_URL || 'http://localhost:3000';

            if (!cognitoDomain || !clientId || !process.env.BACKEND_URL) {
                throw { status: 500, message: 'Cognito configuration missing' };
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

            const redirectUri = `${process.env.BACKEND_URL}/admin-panel/google/callback`;
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

    userInfo = async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw { status: 401, message: 'Access token required' };
            }

            const accessToken = authHeader.split(' ')[1];
            const result =
                await this.service.getUserInfoByAccessToken(accessToken);

            return res.json(result);
        } catch (e: any) {
            console.error('User info error:', e);
            return res.status(e.status || 500).json({
                error: e.message || 'Failed to get user info',
            });
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
