const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
    console.warn('EXPO_PUBLIC_API_URL is not set. Student auth requests will fail.');
}

type LoginInitiateResponse = {
    message: string;
};

export type StudentUser = {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
};

export type StudentLoginResponse = {
    access_token: string;
    refresh_token: string;
    user: StudentUser;
    school_name: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

function getUrl(path: string): string {
    const base = (API_BASE_URL ?? '').replace(/\/$/, '');
    return `${base}${path}`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(getUrl(path), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = payload?.error || payload?.message || 'Request failed';
        throw new Error(message);
    }

    return payload as T;
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
