import api from '@/services/api-client';
import type { StudentUser } from '@/types/auth';

type LoginInitiateResponse = {
    message: string;
};

export type StudentLoginResponse = {
    access_token: string;
    refresh_token: string;
    user: StudentUser;
    school_name: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function postJson<T>(path: string, body: unknown): Promise<T> {
    return api.post<T>(path, body, { requiresAuth: false });
}

export async function initiateStudentLogin(email: string): Promise<LoginInitiateResponse> {
    return postJson<LoginInitiateResponse>('/student/login-initiate', {
        email,
    });
}

export async function loginStudentWithTemporaryPassword(
    email: string,
    password: string
): Promise<StudentLoginResponse> {
    const payload = await postJson<StudentLoginResponse>('/student/login', {
        email,
        password,
    });

    accessToken = payload.access_token;
    refreshToken = payload.refresh_token;

    return payload;
}

export async function refreshStudentAccessToken(
    refreshTokenValue: string
): Promise<{ access_token: string; refresh_token: string }> {
    return postJson<{ access_token: string; refresh_token: string }>(
        '/student/refresh-token',
        {
            refresh_token: refreshTokenValue,
        }
    );
}

export function clearStudentSession(): void {
    accessToken = null;
    refreshToken = null;
}

export function getStudentSession(): {
    accessToken: string | null;
    refreshToken: string | null;
} {
    return { accessToken, refreshToken };
}
