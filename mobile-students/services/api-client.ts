import { getAccessToken } from '@/services/secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/mobile';

console.log('[api-client] API base URL:', API_BASE_URL);
console.log('[api-client] EXPO_PUBLIC_API_URL present:', !!process.env.EXPO_PUBLIC_API_URL);

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

    console.log('[api-client] request start', {
        endpoint,
        url,
        method,
        requiresAuth,
        hasBody: !!body,
    });

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        console.log('[api-client] response received', {
            url,
            status: response.status,
            ok: response.ok,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.log('[api-client] request failed with response body', data);
            throw {
                status: response.status,
                message: data.error || data.message || 'Request failed',
                data,
            };
        }

        console.log('[api-client] request success', { url, data });
        return data;
    } catch (error: any) {
        console.error('[api-client] API Error:', {
            url,
            message: error?.message,
            status: error?.status,
            name: error?.name,
            error,
        });
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
