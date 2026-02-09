// Login
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: number;
        email: string;
        phone_number: string | null;
        given_name: string;
        family_name: string;
    };
    school_name: string;
}

// Refresh Token
export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
}

// Change Temporary Password
export interface ChangeTemporaryPasswordRequest {
    email: string;
    temp_password: string;
    new_password: string;
}

export interface ChangeTemporaryPasswordResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: number;
        email: string;
        phone_number: string | null;
        given_name: string;
        family_name: string;
    };
    school_name: string;
}

// Forgot Password Initiate
export interface ForgotPasswordInitiateRequest {
    email: string;
}

export interface ForgotPasswordInitiateResponse {
    message: string;
}

// Forgot Password Confirm
export interface ForgotPasswordConfirmRequest {
    email: string;
    verification_code: string;
    new_password: string;
}

export interface ForgotPasswordConfirmResponse {
    message: string;
}

// Google OAuth
export interface GoogleLoginRequest {
    state?: string;
}

export interface GoogleCallbackRequest {
    code?: string;
    state?: string;
    error?: string;
}

// User Info
export interface UserInfoResponse {
    user: {
        id: number;
        email: string;
        phone_number: string | null;
        given_name: string;
        family_name: string;
    };
    school_name: string;
}

// Protected Route
export interface ProtectedRouteResponse {
    message: string;
    user: any;
}

// Internal types
export interface AdminWithSchool {
    id: number;
    email: string;
    phone_number: string | null;
    given_name: string;
    family_name: string;
    school_name: string;
}

export interface CognitoAuthData {
    accessToken: string;
    refreshToken: string;
}

export interface UserInfoData {
    email: string;
    sub_id: string;
    phone_number: string;
}
