import { IController } from '../../utils/icontroller';
import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import DB from '../../utils/db-client';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';

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
        this.router.post('/forgot-password-initiate', this.adminAuthLimiter, this.forgotPasswordInitiate);
        this.router.post('/forgot-password-confirm', this.adminAuthLimiter, this.forgotPasswordConfirm);
    }

    forgotPasswordInitiate = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            if (!email) {
                throw { status: 400, message: "EmailRequired" };
            }

            const admins = await DB.query(
                `SELECT email FROM Admin WHERE email = :email`,
                { email }
            );

            if (admins.length === 0) {
                throw { status: 404, message: "UserNotFound" };
            }

            let isVerified;
            try {
                isVerified = await this.cognitoClient.checkUserVerificationStatus(email);
            } catch (err) {
                console.error("Failed to check verification status:", err);
                throw { status: 500, message: "InternalServerError" };
            }

            if (!isVerified.emailVerified) {
                throw { status: 400, message: "EmailNotVerified" };
            }

            try {
                const result = await this.cognitoClient.forgotPassword(email);
                return res.status(200).json({ message: result.message });
            } catch (err: any) {
                console.error("Cognito forgot password error:", err);

                if (err.status === 400 || err.status === 401 || err.status === 429) {
                    throw { status: err.status, message: err.message };
                }

                throw { status: 500, message: "ForgotPasswordInitiateError" };
            }
        } catch (e: any) {
            console.error("Forgot password initiate error:", e);
            return res.status(e.status || 500).json({ error: e.message || "InternalServerError" });
        }
    };

    forgotPasswordConfirm = async (req: Request, res: Response) => {
        try {
            const { email, verification_code, new_password } = req.body;

            if (!email || !verification_code || !new_password) {
                throw { status: 400, message: "RequiredFieldsError" };
            }

            try {
                const result = await this.cognitoClient.confirmForgotPassword(
                    email,
                    verification_code,
                    new_password
                );
                return res.status(200).json({ message: result.message });
            } catch (err: any) {
                if (err.status === 400 || err.status === 401 || err.status === 404) {
                    throw { status: err.status, message: err.message };
                }
                throw { status: 500, message: err.message || "InternalServerError" };
            }
        } catch (e: any) {
            console.error("Forgot password confirm error (admin):", e);
            return res.status(e.status || 500).json({ error: e.message || "InternalServerError" });
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
