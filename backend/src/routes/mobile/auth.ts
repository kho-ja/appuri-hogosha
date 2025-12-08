import { IController } from '../../utils/icontroller';
import express, { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Parent } from '../../utils/cognito-client';
import DB from '../../utils/db-client';
// import {ParentsSNS} from '../../utils/sns-client'
import { verifyToken, ExtendedRequest } from '../../middlewares/mobileAuth';
import { MockCognitoClient } from '../../utils/mock-cognito-client';

class AuthController implements IController {
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
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true'
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

    forgotPasswordInitiate = async (req: Request, res: Response) => {
        try {
            const { phone_number } = req.body;

            // Validate phone number
            if (!phone_number) {
                return res
                    .status(400)
                    .json({
                        error: 'Phone number is required',
                    })
                    .end();
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
                console.error('Phone verification failed:', verifyError);
                return res
                    .status(400)
                    .json({
                        error: 'Phone number verification failed. Please contact support.',
                    })
                    .end();
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
            console.error('Forgot password initiate error:', e);

            // Handle specific Cognito errors
            if (e.name === 'InvalidParameterException') {
                if (e.message && e.message.includes('no registered/verified')) {
                    return res
                        .status(400)
                        .json({
                            error: 'Phone number verification failed. Please contact support.',
                        })
                        .end();
                } else {
                    return res
                        .status(400)
                        .json({
                            error: 'Invalid phone number format',
                        })
                        .end();
                }
            }

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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    forgotPasswordConfirm = async (req: Request, res: Response) => {
        try {
            const { phone_number, verification_code, new_password } = req.body;

            // Validate required fields
            if (!phone_number || !verification_code || !new_password) {
                return res
                    .status(400)
                    .json({
                        error: 'Phone number, verification code, and new password are required',
                    })
                    .end();
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
            console.error('Forgot password confirm error:', e);
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    private normalizeToken(raw: any): string | null {
        if (!raw) return null;
        if (typeof raw === 'string') return raw.trim();
        if (typeof raw === 'object' && typeof raw.data === 'string')
            return raw.data.trim();
        return null;
    }

    deviceToken = async (req: ExtendedRequest, res: Response) => {
        try {
            const { token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            if (
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw {
                    status: 401,
                    message: 'Invalid Device Token',
                };
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    changePassword = async (req: ExtendedRequest, res: Response) => {
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const { phone_number, password, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            // OTP Flow: If no password, initiate phone sign-in
            if (!password) {
                const result = await this.cognitoClient.signInWithPhone(phone_number);
                return res.status(200).json(result).end();
            }

            const authData = await this.cognitoClient.login(
                phone_number,
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
                    phone_number: phone_number.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw {
                    status: 401,
                    message: 'Invalid phone_number or password',
                };
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
                        error: 'Internal server error',
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    changeTemporaryPassword = async (req: Request, res: Response) => {
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
                throw {
                    status: 401,
                    message: 'Invalid phone number or password',
                };
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
            console.error('Error during sign in in auth:', e);
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    verifyOtp = async (req: Request, res: Response) => {
        try {
            const { phone_number, code, session, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            const authData = await this.cognitoClient.respondToAuthChallenge(
                phone_number,
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
                    phone_number: phone_number.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                // Note: Auth success but user not found in DB or invalid token
                // In production might want to handle differently
                throw {
                    status: 401,
                    message: 'User not found in database',
                };
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
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };
}

export default AuthController;
