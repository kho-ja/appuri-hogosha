// Global error handling middleware
// Should be registered AFTER all routes in createApp

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import { config } from '../config';

interface ErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        statusCode: number;
        stack?: string;
    };
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void {
    // Default to 500 if not an ApiError
    let statusCode = 500;
    let message = 'Internal server error';
    let code: string | undefined;
    let isOperational = false;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code;
        isOperational = err.isOperational;
    }

    // Log errors (operational errors at warn level, programming errors at error level)
    const logMessage = `[${statusCode}] ${message}`;
    if (isOperational) {
        console.warn(logMessage, { code, path: req.path });
    } else {
        console.error(logMessage, { code, path: req.path, stack: err.stack });
    }

    const response: ErrorResponse = {
        success: false,
        error: {
            message,
            code,
            statusCode,
        },
    };

    // Include stack trace in development/test for debugging
    if (config.NODE_ENV !== 'production') {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

// 404 handler (should be registered before errorHandler)
export function notFoundHandler(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));
}
