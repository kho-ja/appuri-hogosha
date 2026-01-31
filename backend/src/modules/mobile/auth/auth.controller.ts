import express, { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';

import { verifyToken, ExtendedRequest } from '../../../middlewares/mobileAuth';
import { Parent } from '../../../utils/cognito-client';
import DB from '../../../utils/db-client';
import { IController } from '../../../utils/icontroller';
import { MockCognitoClient } from '../../../utils/mock-cognito-client';
import { config } from '../../../config';
import { ApiError } from '../../../errors/ApiError';

class MobileAuthModuleController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;

    // Add general rate limiting for all auth endpoints
    private authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        message: {
            error: 'Too many authentication requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Stricter rate limiting for login attempts
    private loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: {
            error: 'Too many login attempts from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Rate limiter for forgot password endpoint
    private forgotPasswordLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: {
            error: 'Too many password reset requests from this IP, please try again later.',
        },
        standardHeaders: true, // Return rate limit info in headers
        legacyHeaders: false, // Disable X-RateLimit-* headers
    });

    constructor() {
        this.cognitoClient = config.USE_MOCK_COGNITO
            ? MockCognitoClient
            : Parent;
        this.initRoutes();
    }

    initRoutes(): void {
        // Apply rate limiting to login
        this.router.post('/login', this.loginLimiter, this.login);
        this.router.post('/refresh-token', this.authLimiter, this.refreshToken);
        this.router.post(
            '/change-temp-password',
            this.authLimiter,
            this.changeTemporaryPassword
        );
        this.router.post(
            '/change-password',
            this.authLimiter,
            verifyToken,
            this.changePassword
        );
        this.router.post(
            '/device-token',
            this.authLimiter,
            verifyToken,
            this.deviceToken
        );

        // Apply rate limiting to forgot password endpoints
        this.router.post(
            '/forgot-password-initiate',
            this.forgotPasswordLimiter,
            this.forgotPasswordInitiate
        );
        this.router.post(
            '/forgot-password-confirm',
            this.authLimiter,
            this.forgotPasswordConfirm
        );
        this.router.post('/verify-otp', this.authLimiter, this.verifyOtp);
    }

    forgotPasswordInitiate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number } = req.body;

            // Validate phone number
            if (!phone_number) {
                throw new ApiError(400, 'Phone number is required');
            }

            // Clean phone number for database lookup (remove + and any spaces)
            let cleanPhoneNumber = phone_number.replace(/\s+/g, ''); // Remove spaces
            if (cleanPhoneNumber.startsWith('+')) {
                cleanPhoneNumber = cleanPhoneNumber.slice(1); // Remove + for database
            }

            // Check if user exists in database first
            const parents = await DB.query(
                `SELECT phone_number, email FROM Parent WHERE phone_number = :phone_number`,
                {
                    phone_number: cleanPhoneNumber,
                }
            );

            if (parents.length === 0) {
                // For security, we still return success message even if user doesn't exist
                return res
                    .status(200)
                    .json({
                        message:
                            'If this phone number is registered, you will receive a verification code',
                    })
                    .end();
            }

            // Format phone number for Cognito (must have + prefix)
            const cognitoPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            try {
                // First, try to verify the user's phone number if it's not verified
                const verificationStatus =
                    await this.cognitoClient.checkUserVerificationStatus(
                        cognitoPhoneNumber
                    );

                if (!verificationStatus.phoneVerified) {
                    await this.cognitoClient.verifyPhoneNumber(
                        cognitoPhoneNumber
                    );
                } else {
                    console.log('Phone already verified');
                }
            } catch (verifyError) {
                throw new ApiError(
                    400,
                    'Phone number verification failed. Please contact support.'
                );
            }

            // Call Cognito forgot password (this will send SMS)
            const result =
                await this.cognitoClient.forgotPassword(cognitoPhoneNumber);

            return res
                .status(200)
                .json({
                    message: result.message,
                })
                .end();
        } catch (e: any) {
            // Handle specific Cognito errors
            if (e?.name === 'InvalidParameterException') {
                if (
                    e?.message &&
                    e.message.includes('no registered/verified')
                ) {
                    return next(
                        new ApiError(
                            400,
                            'Phone number verification failed. Please contact support.'
                        )
                    );
                }
                return next(new ApiError(400, 'Invalid phone number format'));
            }

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
            const { phone_number, verification_code, new_password } = req.body;

            // Validate required fields
            if (!phone_number || !verification_code || !new_password) {
                throw new ApiError(
                    400,
                    'Phone number, verification code, and new password are required'
                );
            }

            // Format phone number for Cognito
            const fullPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            // Confirm forgot password with Cognito
            const result = await this.cognitoClient.confirmForgotPassword(
                fullPhoneNumber,
                verification_code,
                new_password
            );

            return res
                .status(200)
                .json({
                    message: result.message,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    private normalizeToken(raw: any): string | null {
        if (!raw) return null;
        if (typeof raw === 'string') return raw.trim();
        if (typeof raw === 'object' && typeof raw.data === 'string')
            return raw.data.trim();
        return null;
    }

    deviceToken = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            if (
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid Device Token');
            }

            await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                id: req.user.id,
                arn: normalizedToken,
            });

            return res
                .status(200)
                .json({
                    message: 'Device token updated successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    changePassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { previous_password, new_password } = req.body;
            await this.cognitoClient.changePassword(
                req.token,
                previous_password,
                new_password
            );

            return res
                .status(200)
                .json({
                    message: 'Password changed successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone_number, password, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            const formattedPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;
            // OTP Flow: If no password, initiate phone sign-in
            if (!password) {
                const result =
                    await this.cognitoClient.signInWithPhone(
                        formattedPhoneNumber
                    );
                return res.status(200).json(result).end();
            }

            const authData = await this.cognitoClient.login(
                formattedPhoneNumber,
                password
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: formattedPhoneNumber.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid phone_number or password');
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(
                    `UPDATE Parent SET last_login_at = NOW(), arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
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
            const { phone_number, temp_password, new_password, token } =
                req.body;
            const normalizedToken = this.normalizeToken(token);
            const authData = await this.cognitoClient.changeTempPassword(
                phone_number,
                temp_password,
                new_password
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: phone_number.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid phone number or password');
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(
                    `UPDATE Parent SET arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone_number, code, session, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            let formattedPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            const authData = await this.cognitoClient.respondToAuthChallenge(
                formattedPhoneNumber,
                code,
                session
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: formattedPhoneNumber.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                // Note: Auth success but user not found in DB or invalid token
                // In production might want to handle differently
                throw new ApiError(401, 'User not found in database');
            }

            const parent = parents[0];

            try {
                await DB.execute(
                    `UPDATE Parent SET last_login_at = NOW(), arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };
}

export default MobileAuthModuleController;
