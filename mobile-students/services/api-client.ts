import { getAccessToken } from '@/services/secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/mobile';

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    requiresAuth?: boolean;
}

const getAuthToken = async (): Promise<string | null> => {
    try {
        return await getAccessToken();
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

const buildHeaders = async (
    customHeaders?: Record<string, string>,
    requiresAuth = true
): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
    };

    if (requiresAuth) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

export async function request<TResponse>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<TResponse> {
    const {
        method = 'GET',
        body,
        headers: customHeaders,
        requiresAuth = false,
    } = options;

    const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint}`;

    const headers = await buildHeaders(customHeaders, requiresAuth);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw {
                status: response.status,
                message: data.error || data.message || 'Request failed',
                data,
            };
        }

        return data;
    } catch (error: any) {
        console.error('API Error:', error);
        throw error;
    }
}

export default {
    get: <T,>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T,>(endpoint: string, body?: any, options?: RequestOptions) =>
        request<T>(endpoint, { ...options, method: 'POST', body }),
    put: <T,>(endpoint: string, body?: any, options?: RequestOptions) =>
        request<T>(endpoint, { ...options, method: 'PUT', body }),
    delete: <T,>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }),
};
