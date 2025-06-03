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
    GetUserCommandInput, AdminDeleteUserCommand, AdminDeleteUserCommandInput
} from "@aws-sdk/client-cognito-identity-provider";
import process from "node:process";

class CognitoClient {
    private client: CognitoIdentityProviderClient
    private pool_id: string;
    private client_id: string;

    constructor(pool_id: string, client_id: string) {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.SERVICE_REGION,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY ?? '',
                secretAccessKey: process.env.SECRET_ACCESS_KEY ?? ''
            }
        })

        this.pool_id = pool_id;
        this.client_id = client_id;
    }

    async delete(identifier: string): Promise<deleteOutput> {
        const params: AdminDeleteUserCommandInput = {
            Username: identifier,
            UserPoolId: this.pool_id,
        }

        try {
            const command = new AdminDeleteUserCommand(params);
            const changeData = await this.client.send(command);
            console.log('user deleted successfully', changeData);

            return {
                message: 'user deleted successfully'
            }
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid email',
                } as deleteThrow
            } else if (e.name === 'UserNotFoundException') {
                throw {
                    status: 404,
                    message: 'User Not Found',
                } as deleteThrow
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as deleteThrow
            }
        }
    }

    async register(identifier: string, email: string, phone_number: string): Promise<registerOutput> {
        const params: AdminCreateUserCommandInput = {
            UserPoolId: this.pool_id,
            Username: identifier,
            UserAttributes: [
                { Name: 'email', Value: email, },
                ...(phone_number ? [{ Name: 'phone_number', Value: phone_number, }] : [])
            ]
        }

        try {
            const command = new AdminCreateUserCommand(params);
            const data = await this.client.send(command)

            return {
                sub_id: data.User?.Username ?? ''
            }
        } catch (e: any) {
            console.error('error:', e)
            if (e.name === 'UsernameExistsException') {
                throw {
                    status: 401,
                    message: 'Email already exists'
                } as registerThrow
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as registerThrow
            }
        }
    }

    async changeTempPassword(identifier: string, tempPassword: string, newPassword: string): Promise<changeTempPasswordOutput> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                USERNAME: identifier,
                PASSWORD: tempPassword,
            }
        };

        try {
            const authCommand = new InitiateAuthCommand(params);
            const authData = await this.client.send(authCommand);

            if (authData.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                const challengeParams: RespondToAuthChallengeCommandInput = {
                    ClientId: this.client_id,
                    ChallengeName: "NEW_PASSWORD_REQUIRED",
                    Session: authData.Session,
                    ChallengeResponses: {
                        USERNAME: identifier,
                        NEW_PASSWORD: newPassword,
                    }
                }

                const challengeCommand = new RespondToAuthChallengeCommand(challengeParams);
                const challengeData = await this.client.send(challengeCommand);

                return {
                    accessToken: challengeData.AuthenticationResult?.AccessToken ?? '',
                    refreshToken: challengeData.AuthenticationResult?.RefreshToken ?? ''
                }
            } else {
                throw {
                    status: 403,
                    message: 'Change temporary password not found',
                } as changeTempPasswordThrow
            }
        } catch (e: any) {
            if (e.name === 'InvalidPasswordException') {
                throw {
                    status: 401,
                    message: 'Password must Contains  at least 8 characters, 1 number, 1 special characters, 1 uppercase, 1 lowercase',
                } as changeTempPasswordThrow
            } else if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid username or password',
                } as changeTempPasswordThrow
            } else {
                if (e.status) {
                    throw e as changeTempPasswordThrow
                } else {
                    throw {
                        status: 500,
                        message: 'Internal server error',
                    } as changeTempPasswordThrow
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
            }
        }

        try {
            const command = new InitiateAuthCommand(params);
            const authData = await this.client.send(command)

            if (authData?.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                throw {
                    status: 403,
                    message: 'Please change your temporary password.'
                } as loginThrow
            } else if (authData?.AuthenticationResult) {
                return {
                    accessToken: authData.AuthenticationResult.AccessToken ?? '',
                    refreshToken: authData.AuthenticationResult.RefreshToken ?? ''
                }
            } else {
                throw false;
            }
        } catch (e: any) {
            console.error('error:', e)
            if (e.name === 'NotAuthorizedException') {
                throw {
                    status: 401,
                    message: 'Invalid username or password'
                } as loginThrow
            } else if (e.status === 403) {
                throw e as loginThrow;
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as accessTokenThrow
            }
        }
    }

    async changePassword(accessToken: string, previousPassword: string, newPassword: string) {
        const params: ChangePasswordCommandInput = {
            AccessToken: accessToken,
            PreviousPassword: previousPassword,
            ProposedPassword: newPassword,
        }

        try {
            const command = new ChangePasswordCommand(params);
            const changeData = await this.client.send(command);
            console.log('password change successfully', changeData);
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                console.log(e.message)
            } else if (e.name === 'InvalidPasswordException') {
                console.log(e.message)
            } else {
                console.log('error:', e)
            }
        }
    }

    async accessToken(accessToken: string): Promise<accessTokenOutput> {
        const params: GetUserCommandInput = {
            AccessToken: accessToken
        }

        try {
            const command = new GetUserCommand(params);
            const userData = await this.client.send(command)
            return {
                email: userData.UserAttributes?.find(obj => obj.Name === 'email')?.Value ?? '',
                phone_number: userData.UserAttributes?.find(obj => obj.Name === 'phone_number')?.Value ?? '',
                sub_id: userData.UserAttributes?.find(obj => obj.Name === 'sub')?.Value ?? ''
            }
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                if (e.message === 'Access Token has expired') {
                    throw {
                        status: 401,
                        message: 'Access token has expired. Please use a refresh token to obtain a new access token.'
                    } as accessTokenThrow
                } else {
                    throw {
                        status: 401,
                        message: 'Access token is invalid.',
                    } as accessTokenThrow
                }
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as accessTokenThrow
            }
        }
    }

    async refreshToken(refreshToken: string): Promise<refreshTokenOutput> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken
            }
        }

        try {
            const command = new InitiateAuthCommand(params);
            const authData = await this.client.send(command)

            if (authData?.AuthenticationResult) {
                return {
                    accessToken: authData.AuthenticationResult.AccessToken ?? '',
                    refreshToken: authData.AuthenticationResult.RefreshToken ?? '',
                }
            } else {
                throw false;
            }
        } catch (e: any) {
            if (e.name === 'NotAuthorizedException') {
                if (e.message === 'Refresh Token has expired') {
                    throw {
                        status: 401,
                        message: 'Refresh token has expired'
                    } as refreshTokenThrow

                } else {
                    throw {
                        status: 403,
                        message: 'Refresh token is invalid'
                    } as refreshTokenThrow
                }
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as refreshTokenThrow
            }
        }
    }
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
    sub_id: string
}

interface registerThrow {
    status: 401 | 403 | 500;
    message: string;
}

interface deleteOutput {
    message: string
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

export { Parent, Admin }