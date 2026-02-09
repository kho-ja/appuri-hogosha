import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// HTTP Methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request options
interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  timeout?: number;
}

// API Response wrapper
interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// Token management callbacks (set by auth-context)
let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;

export const setAuthCallbacks = (callbacks: {
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}) => {
  onUnauthorized = callbacks.onUnauthorized || null;
  onForbidden = callbacks.onForbidden || null;
};

/**
 * Get the current auth token from storage
 */
const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('session');
};

/**
 * Build headers for API requests
 */
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

/**
 * Main request function with error handling and interceptors
 */
async function request<TResponse, TBody = unknown>(
  endpoint: string,
  options: RequestOptions<TBody> = {}
): Promise<ApiResponse<TResponse>> {
  const {
    method = 'GET',
    body,
    headers: customHeaders,
    requiresAuth = true,
    timeout = 30000,
  } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const headers = await buildHeaders(customHeaders, requiresAuth);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response first to get error message
    const data = await response.json().catch(() => ({}));

    // Handle auth errors - only trigger callbacks for authenticated requests
    if (response.status === 401) {
      if (requiresAuth) {
        // Session expired - trigger refresh/logout
        onUnauthorized?.();
        throw new UnauthorizedError();
      }
      // For non-auth requests (login, etc), just throw ApiError with message
      throw new ApiError(
        data.error || data.message || 'Invalid credentials',
        response.status
      );
    }

    if (response.status === 403) {
      if (requiresAuth) {
        // Forbidden - trigger logout
        onForbidden?.();
        throw new ForbiddenError();
      }
      // For non-auth requests, throw ApiError with message
      throw new ApiError(
        data.error || data.message || 'Forbidden',
        response.status
      );
    }

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'Request failed',
        response.status
      );
    }

    return {
      data: data as TResponse,
      status: response.status,
      ok: true,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timed out');
      }
      throw new NetworkError(error.message);
    }

    throw new NetworkError('Unknown error occurred');
  }
}

// Convenience methods
const apiClient = {
  get: <TResponse>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) => request<TResponse>(endpoint, { ...options, method: 'GET' }),

  post: <TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>
  ) =>
    request<TResponse, TBody>(endpoint, { ...options, method: 'POST', body }),

  put: <TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>
  ) => request<TResponse, TBody>(endpoint, { ...options, method: 'PUT', body }),

  patch: <TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, 'method' | 'body'>
  ) =>
    request<TResponse, TBody>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <TResponse>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) => request<TResponse>(endpoint, { ...options, method: 'DELETE' }),
};

// Export base URL for cases where it's needed directly
export { API_BASE_URL };

// Default export
export default apiClient;
