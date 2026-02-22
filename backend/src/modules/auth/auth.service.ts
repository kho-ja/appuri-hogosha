import { AuthRepository } from './auth.repository';
import {
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    ChangeTemporaryPasswordRequest,
    ChangeTemporaryPasswordResponse,
    ForgotPasswordInitiateRequest,
    ForgotPasswordInitiateResponse,
    ForgotPasswordConfirmRequest,
    ForgotPasswordConfirmResponse,
    UserInfoResponse,
    CognitoAuthData,
} from './auth.dto';
import { config } from '../../config';

export class AuthService {
    constructor(
        private repository: AuthRepository,
        private cognitoClient: any
    ) { }

    async login(request: LoginRequest): Promise<LoginResponse> {
        const { email, password } = request;

        const authData: CognitoAuthData = await this.cognitoClient.login(
            email,
            password
        );

        const admin = await this.repository.findAdminByEmail(email);
        if (!admin) {
            throw {
                status: 401,
                message: 'invalid_email_or_password',
            };
        }

        try {
            const isFirstTime =
                await this.cognitoClient.isFirstTimeLogin(email);
            if (isFirstTime) {
                await this.cognitoClient.verifyEmail(email);
            }
        } catch {
            console.error('Failed to auto-verify admin email');
        }

        return {
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
        };
    }

    async refreshToken(
        request: RefreshTokenRequest
    ): Promise<RefreshTokenResponse> {
        const { refresh_token } = request;

        const authData = await this.cognitoClient.refreshToken(refresh_token);

        return {
            access_token: authData.accessToken,
            refresh_token: refresh_token,
        };
    }

    async changeTemporaryPassword(
        request: ChangeTemporaryPasswordRequest
    ): Promise<ChangeTemporaryPasswordResponse> {
        const { email, temp_password, new_password } = request;

        const authData = await this.cognitoClient.changeTempPassword(
            email,
            temp_password,
            new_password
        );

        const admin = await this.repository.findAdminByEmail(email);
        if (!admin) {
            throw {
                status: 401,
                message: 'invalid_email_or_password',
            };
        }

        try {
            await this.cognitoClient.verifyEmail(email);
        } catch {
            console.error('Failed to auto-verify admin email');
        }

        return {
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
        };
    }

    async forgotPasswordInitiate(
        request: ForgotPasswordInitiateRequest
    ): Promise<ForgotPasswordInitiateResponse> {
        const { email } = request;

        if (!email) {
            throw { status: 400, message: 'EmailRequired' };
        }

        const admin = await this.repository.findAdminByEmail(email);
        if (!admin) {
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
            return { message: result.message };
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
    }

    async forgotPasswordConfirm(
        request: ForgotPasswordConfirmRequest
    ): Promise<ForgotPasswordConfirmResponse> {
        const { email, verification_code, new_password } = request;

        if (!email || !verification_code || !new_password) {
            throw { status: 400, message: 'RequiredFieldsError' };
        }

        try {
            const result = await this.cognitoClient.confirmForgotPassword(
                email,
                verification_code,
                new_password
            );
            return { message: result.message };
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
    }

    async getUserInfoByAccessToken(
        accessToken: string
    ): Promise<UserInfoResponse> {
        const userData = await this.getUserInfo(accessToken);

        const admin = await this.repository.findAdminByEmail(userData.email);
        if (!admin) {
            throw { status: 404, message: 'Admin not found' };
        }

        return {
            user: {
                id: admin.id,
                email: admin.email,
                phone_number: admin.phone_number,
                given_name: admin.given_name,
                family_name: admin.family_name,
            },
            school_name: admin.school_name,
        };
    }

    async handleGoogleCallback(
        code: string,
        redirectUri: string
    ): Promise<{ admin: any; accessToken: string; refreshToken?: string }> {
        const tokenResponse = await this.exchangeCodeForTokens(
            code,
            redirectUri
        );

        if (!tokenResponse.access_token) {
            throw { status: 400, message: 'Failed to get access token' };
        }

        const userData = await this.getUserInfo(tokenResponse.access_token);

        const admin = await this.repository.findAdminByEmail(userData.email);
        if (!admin) {
            console.error('Admin not found for email:', userData.email);
            throw { status: 404, message: 'Admin not found for email' };
        }

        await this.repository.updateLastLogin(admin.id);

        // Return plain object, not database model instance
        const plainAdmin = {
            id: admin.id,
            email: admin.email,
            phone_number: admin.phone_number,
            given_name: admin.given_name,
            family_name: admin.family_name,
            school_name: admin.school_name,
        };

        return {
            admin: plainAdmin,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
        };
    }

    private async getUserInfo(accessToken: string) {
        const cognitoDomain = config.COGNITO_DOMAIN;
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
        const cognitoDomain = config.COGNITO_DOMAIN;
        const clientId = config.ADMIN_CLIENT_ID;
        const clientSecret = config.ADMIN_CLIENT_SECRET;

        const tokenUrl = `${cognitoDomain}/oauth2/token`;

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId!,
            code: code,
            redirect_uri: redirectUri,
        });

        // Include client_secret if it exists (for confidential clients)
        if (clientSecret) {
            params.append('client_secret', clientSecret);
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers,
            body: params.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Token exchange failed with status:', response.status);
            console.error('Error response body:', errorBody);
            throw new Error('Failed to exchange code for tokens');
        }

        return await response.json();
    }
}
