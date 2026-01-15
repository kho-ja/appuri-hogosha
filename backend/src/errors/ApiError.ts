// Custom error class for API errors
// Use this instead of throwing raw Error objects

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly code?: string;
    public readonly isOperational: boolean;

    constructor(
        statusCode: number,
        message: string,
        code?: string,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        this.name = this.constructor.name;
    }

    // Factory methods for common errors
    static badRequest(message: string, code?: string): ApiError {
        return new ApiError(400, message, code);
    }

    static unauthorized(
        message: string = 'Unauthorized',
        code?: string
    ): ApiError {
        return new ApiError(401, message, code);
    }

    static forbidden(message: string = 'Forbidden', code?: string): ApiError {
        return new ApiError(403, message, code);
    }

    static notFound(message: string = 'Not found', code?: string): ApiError {
        return new ApiError(404, message, code);
    }

    static conflict(message: string, code?: string): ApiError {
        return new ApiError(409, message, code);
    }

    static internal(
        message: string = 'Internal server error',
        code?: string
    ): ApiError {
        return new ApiError(500, message, code, false);
    }
}
