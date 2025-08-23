import {
    AdminCreateUserCommand,
    InitiateAuthCommandInput,
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    AdminCreateUserCommandInput,
    RespondToAuthChallengeCommand,
    RespondToAuthChallengeCommandInput,
    ChangePasswordCommand,
    ChangePasswordCommandInput,
    GetUserCommand,
    GetUserCommandInput,
    AdminDeleteUserCommand,
    AdminDeleteUserCommandInput,
    ConfirmForgotPasswordCommand,
    ConfirmForgotPasswordCommandInput,
    ForgotPasswordCommand,
    ForgotPasswordCommandInput,
    AdminGetUserCommand,
    AdminGetUserCommandInput,
    AdminUpdateUserAttributesCommand,
    AdminUpdateUserAttributesCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import process from 'node:process';

class CognitoClient {
    private client: CognitoIdentityProviderClient;
    private pool_id: string;
    private client_id: string;

    constructor(pool_id: string, client_id: string) {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.SERVICE_REGION,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY ?? '',
                secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
            },
        });

        this.pool_id = pool_id;
        this.client_id = client_id;
    }

    async resendTemporaryPassword(
        identifier: string
    ): Promise<resendTemporaryPasswordOutput> {
        const params: AdminCreateUserCommandInput = {
            UserPoolId: this.pool_id,
            Username: identifier,
            MessageAction: 'RESEND',
        };

        try {
            const command = new AdminCreateUserCommand(params);
            const data = await this.client.send(command);

            console.log('Temporary password resent successfully', data);

            return {
                message: 'Temporary password resent successfully',
            };
        } catch (e: any) {
            console.error('error:', e);

            if (e.name === 'UserNotFoundException') {
                throw {
                    status: 404,
                    message: 'User not found',
                } as resendTemporaryPasswordThrow;
            } else if (e.name === 'UnsupportedUserStateException') {
                throw {
                    status: 400,
                    message:
                        'User has already activated their account. No temporary password needed.',
                } as resendTemporaryPasswordThrow;
            } else if (e.name === 'InvalidParameterException') {
                throw {
                    status: 400,
                    message: 'Invalid parameter provided',
                } as resendTemporaryPasswordThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as resendTemporaryPasswordThrow;
            }
        }
    }

    async delete(identifier: string): Promise<deleteOutput> {
        const params: AdminDeleteUserCommandInput = {
            Username: identifier,
            UserPoolId: this.pool_id,
        };

        try {
            const command = new AdminDeleteUserCommand(params);
            const changeData = await this.client.send(command);
            console.log('user deleted successfully', changeData);

            return {
                message: 'user deleted successfully',
            };
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid email',
                } as deleteThrow;
            } else if (e.name === 'UserNotFoundException') {
                throw {
                    status: 404,
                    message: 'User Not Found',
                } as deleteThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as deleteThrow;
            }
        }
    }

    async register(
        identifier: string,
        email: string,
        phone_number: string
    ): Promise<registerOutput> {
        const params: AdminCreateUserCommandInput = {
            UserPoolId: this.pool_id,
            Username: identifier,
            UserAttributes: [
                { Name: 'email', Value: email },
                ...(phone_number
                    ? [{ Name: 'phone_number', Value: phone_number }]
                    : []),
            ],
        };

        try {
            const command = new AdminCreateUserCommand(params);
            const data = await this.client.send(command);

            // Auto-verify phone number after user creation
            if (phone_number) {
                console.log(
                    `Auto-verifying phone number for user: ${identifier}`
                );
                await this.verifyPhoneNumber(identifier);
            }

            return {
                sub_id: data.User?.Username ?? '',
            };
        } catch (e: any) {
            console.error('error:', e);
            if (e.name === 'UsernameExistsException') {
                // If user already exists, try to verify their phone number
                if (phone_number) {
                    console.log(
                        `User exists, attempting to verify phone number: ${identifier}`
                    );
                    try {
                        await this.verifyPhoneNumber(identifier);
                    } catch (verifyError) {
                        console.error(
                            'Failed to verify existing user phone:',
                            verifyError
                        );
                    }
                }

                throw {
                    status: 401,
                    message: 'Email already exists',
                } as registerThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as registerThrow;
            }
        }
    }

    // Add this new method to your CognitoClient class
    async verifyPhoneNumber(username: string): Promise<void> {
        try {
            console.log('Verifying phone number for user: %s', username); // Fixed: Use %s placeholder

            const updateParams: AdminUpdateUserAttributesCommandInput = {
                UserPoolId: this.pool_id,
                Username: username,
                UserAttributes: [
                    {
                        Name: 'phone_number_verified',
                        Value: 'true',
                    },
                ],
            };

            const updateCommand = new AdminUpdateUserAttributesCommand(
                updateParams
            );
            await this.client.send(updateCommand);

            console.log('✅ Phone number verified for user: %s', username); // Fixed: Use %s placeholder
        } catch (error: any) {
            console.error(
                '❌ Failed to verify phone number for %s:',
                username,
                error
            ); // Fixed: Use %s placeholder
            throw error;
        }
    }

    async checkUserVerificationStatus(
        username: string
    ): Promise<{ phoneVerified: boolean; emailVerified: boolean }> {
        try {
            const getUserParams: AdminGetUserCommandInput = {
                UserPoolId: this.pool_id,
                Username: username,
            };

            const getUserCommand = new AdminGetUserCommand(getUserParams);
            const userResult = await this.client.send(getUserCommand);

            const phoneVerified =
                userResult.UserAttributes?.find(
                    attr => attr.Name === 'phone_number_verified'
                )?.Value === 'true';

            const emailVerified =
                userResult.UserAttributes?.find(
                    attr => attr.Name === 'email_verified'
                )?.Value === 'true';

            return { phoneVerified, emailVerified };
        } catch (error: any) {
            console.error(
                'Failed to check verification status for %s:',
                username,
                error
            ); // Fixed: Use %s placeholder
            return { phoneVerified: false, emailVerified: false };
        }
    }

    async changeTempPassword(
        identifier: string,
        tempPassword: string,
        newPassword: string
    ): Promise<changeTempPasswordOutput> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                USERNAME: identifier,
                PASSWORD: tempPassword,
            },
        };

        try {
            const authCommand = new InitiateAuthCommand(params);
            const authData = await this.client.send(authCommand);

            if (authData.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                const challengeParams: RespondToAuthChallengeCommandInput = {
                    ClientId: this.client_id,
                    ChallengeName: 'NEW_PASSWORD_REQUIRED',
                    Session: authData.Session,
                    ChallengeResponses: {
                        USERNAME: identifier,
                        NEW_PASSWORD: newPassword,
                    },
                };

                const challengeCommand = new RespondToAuthChallengeCommand(
                    challengeParams
                );
                const challengeData = await this.client.send(challengeCommand);

                return {
                    accessToken:
                        challengeData.AuthenticationResult?.AccessToken ?? '',
                    refreshToken:
                        challengeData.AuthenticationResult?.RefreshToken ?? '',
                };
            } else {
                throw {
                    status: 403,
                    message: 'Change temporary password not found',
                } as changeTempPasswordThrow;
            }
        } catch (e: any) {
            if (e.name === 'InvalidPasswordException') {
                throw {
                    status: 401,
                    message:
                        'Password must Contains  at least 8 characters, 1 number, 1 special characters, 1 uppercase, 1 lowercase',
                } as changeTempPasswordThrow;
            } else if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid username or password',
                } as changeTempPasswordThrow;
            } else {
                if (e.status) {
                    throw e as changeTempPasswordThrow;
                } else {
                    throw {
                        status: 500,
                        message: 'Internal server error',
                    } as changeTempPasswordThrow;
                }
            }
        }
    }

    async login(identifier: string, password: string): Promise<loginOutput> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                USERNAME: identifier,
                PASSWORD: password,
            },
        };

        try {
            const command = new InitiateAuthCommand(params);
            const authData = await this.client.send(command);

            if (authData?.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                throw {
                    status: 403,
                    message: 'Please change your temporary password.',
                } as loginThrow;
            } else if (authData?.AuthenticationResult) {
                return {
                    accessToken:
                        authData.AuthenticationResult.AccessToken ?? '',
                    refreshToken:
                        authData.AuthenticationResult.RefreshToken ?? '',
                };
            } else {
                throw false;
            }
        } catch (e: any) {
            console.error('error:', e);
            if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid username or password',
                } as loginThrow;
            } else if (e.status === 403) {
                throw e as loginThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as accessTokenThrow;
            }
        }
    }

    async changePassword(
        accessToken: string,
        previousPassword: string,
        newPassword: string
    ) {
        const params: ChangePasswordCommandInput = {
            AccessToken: accessToken,
            PreviousPassword: previousPassword,
            ProposedPassword: newPassword,
        };

        try {
            const command = new ChangePasswordCommand(params);
            const changeData = await this.client.send(command);
            console.log('password change successfully', changeData);
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                console.log(e.message);
            } else if (e.name === 'InvalidPasswordException') {
                console.log(e.message);
            } else {
                console.log('error:', e);
            }
        }
    }

    async accessToken(accessToken: string): Promise<accessTokenOutput> {
        const params: GetUserCommandInput = {
            AccessToken: accessToken,
        };

        try {
            const command = new GetUserCommand(params);
            const userData = await this.client.send(command);
            return {
                email:
                    userData.UserAttributes?.find(obj => obj.Name === 'email')
                        ?.Value ?? '',
                phone_number:
                    userData.UserAttributes?.find(
                        obj => obj.Name === 'phone_number'
                    )?.Value ?? '',
                sub_id:
                    userData.UserAttributes?.find(obj => obj.Name === 'sub')
                        ?.Value ?? '',
            };
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                if (e.message === 'Access Token has expired') {
                    throw {
                        status: 401,
                        message:
                            'Access token has expired. Please use a refresh token to obtain a new access token.',
                    } as accessTokenThrow;
                } else {
                    throw {
                        status: 401,
                        message: 'Access token is invalid.',
                    } as accessTokenThrow;
                }
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as accessTokenThrow;
            }
        }
    }

    async refreshToken(refreshToken: string): Promise<refreshTokenOutput> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        };

        try {
            const command = new InitiateAuthCommand(params);
            const authData = await this.client.send(command);

            if (authData?.AuthenticationResult) {
                return {
                    accessToken:
                        authData.AuthenticationResult.AccessToken ?? '',
                    refreshToken:
                        authData.AuthenticationResult.RefreshToken ?? '',
                };
            } else {
                throw false;
            }
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                if (e.message === 'Refresh Token has expired') {
                    throw {
                        status: 401,
                        message: 'Refresh token has expired',
                    } as refreshTokenThrow;
                } else {
                    throw {
                        status: 403,
                        message: 'Refresh token is invalid',
                    } as refreshTokenThrow;
                }
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as refreshTokenThrow;
            }
        }
    }

    async forgotPassword(identifier: string): Promise<forgotPasswordOutput> {
        console.log(`Initiating forgot password for: ${identifier}`);

        const params: ForgotPasswordCommandInput = {
            ClientId: this.client_id,
            Username: identifier,
        };

        try {
            const command = new ForgotPasswordCommand(params);
            const result = await this.client.send(command);

            console.log('Forgot password initiated successfully:', result);

            return {
                message:
                    'If this phone number is registered, you will receive a verification code',
            };
        } catch (e: any) {
            console.error('Forgot password error:', e);

            if (e.name === 'UserNotFoundException') {
                // For security, we don't reveal if user exists or not
                console.log(
                    'User not found, but returning generic success message'
                );
                return {
                    message:
                        'If this phone number is registered, you will receive a verification code',
                };
            } else if (e.name === 'InvalidParameterException') {
                console.error('Invalid parameter error:', e.message);

                if (e.message && e.message.includes('no registered/verified')) {
                    throw {
                        status: 400,
                        message:
                            'Phone number is not verified in the system. Please contact support.',
                    } as forgotPasswordThrow;
                } else {
                    throw {
                        status: 400,
                        message: 'Invalid phone number format',
                    } as forgotPasswordThrow;
                }
            } else if (e.name === 'LimitExceededException') {
                throw {
                    status: 429,
                    message: 'Too many requests. Please try again later',
                } as forgotPasswordThrow;
            } else if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message:
                        'Unable to send verification code. Please contact support.',
                } as forgotPasswordThrow;
            } else {
                console.error('Unexpected error:', e);
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as forgotPasswordThrow;
            }
        }
    }

    async confirmForgotPassword(
        identifier: string,
        confirmationCode: string,
        newPassword: string
    ): Promise<confirmForgotPasswordOutput> {
        const params: ConfirmForgotPasswordCommandInput = {
            ClientId: this.client_id,
            Username: identifier,
            ConfirmationCode: confirmationCode,
            Password: newPassword,
        };

        try {
            const command = new ConfirmForgotPasswordCommand(params);
            await this.client.send(command);

            return {
                message: 'Password reset successfully',
            };
        } catch (e: any) {
            console.error('Confirm forgot password error:', e);

            if (e.name === 'UserNotFoundException') {
                throw {
                    status: 404,
                    message: 'User not found',
                } as confirmForgotPasswordThrow;
            } else if (e.name === 'CodeMismatchException') {
                throw {
                    status: 400,
                    message: 'Invalid verification code',
                } as confirmForgotPasswordThrow;
            } else if (e.name === 'ExpiredCodeException') {
                throw {
                    status: 400,
                    message: 'Verification code has expired',
                } as confirmForgotPasswordThrow;
            } else if (e.name === 'InvalidPasswordException') {
                throw {
                    status: 400,
                    message:
                        'Password must contain at least 8 characters, 1 number, 1 special character, 1 uppercase, 1 lowercase',
                } as confirmForgotPasswordThrow;
            } else if (e.name === 'LimitExceededException') {
                throw {
                    status: 400,
                    message: 'Too many failed attempts. Please try again later',
                } as confirmForgotPasswordThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error',
                } as confirmForgotPasswordThrow;
            }
        }
    }
}

interface forgotPasswordOutput {
    message: string;
}

interface forgotPasswordThrow {
    status: 400 | 404 | 429 | 401 | 500;
    message: string;
}

interface confirmForgotPasswordOutput {
    message: string;
}

interface confirmForgotPasswordThrow {
    status: 400 | 401 | 404 | 500;
    message: string;
}

interface resendTemporaryPasswordOutput {
    message: string;
}

interface resendTemporaryPasswordThrow {
    status: 400 | 404 | 500;
    message: string;
}

interface accessTokenOutput {
    email: string;
    phone_number: string;
    sub_id: string;
}

interface accessTokenThrow {
    status: 401 | 500;
    message: string;
}

interface loginOutput {
    accessToken: string;
    refreshToken: string;
}

interface loginThrow {
    status: 401 | 403 | 500;
    message: string;
}

interface refreshTokenOutput {
    accessToken: string;
    refreshToken: string;
}

interface refreshTokenThrow {
    status: 401 | 403 | 500;
    message: string;
}

interface changeTempPasswordOutput {
    accessToken: string;
    refreshToken: string;
}

interface changeTempPasswordThrow {
    status: 401 | 403 | 500;
    message: string;
}

interface registerOutput {
    sub_id: string;
}

interface registerThrow {
    status: 401 | 403 | 500;
    message: string;
}

interface deleteOutput {
    message: string;
}

interface deleteThrow {
    status: 401 | 404 | 500;
    message: string;
}

const Parent = new CognitoClient(
    process.env.PARENT_POOL_ID ?? '',
    process.env.PARENT_CLIENT_ID ?? ''
);

const Admin = new CognitoClient(
    process.env.ADMIN_POOL_ID ?? '',
    process.env.ADMIN_CLIENT_ID ?? ''
);

export { Parent, Admin };
