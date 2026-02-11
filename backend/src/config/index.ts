// Centralized configuration with validation
// All env variables should be accessed through this module

interface Config {
    // Server
    PORT: number;
    NODE_ENV: 'development' | 'test' | 'production';

    // CORS
    FRONTEND_URL: string;

    // Pagination
    PER_PAGE: number;

    // AWS
    SERVICE_REGION: string;
    ACCESS_KEY: string;
    SECRET_ACCESS_KEY: string;
    BUCKET_ACCESS_KEY: string;
    BUCKET_SECRET_ACCESS_KEY: string;
    BUCKET_NAME: string;

    // Cognito
    COGNITO_DOMAIN: string;
    USE_MOCK_COGNITO: boolean;

    // Database
    DB_HOST: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
}

function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key] ?? defaultValue;
    if (value === undefined) {
        throw new Error(
            `Missing required environment variable: ${key}. Please set it in your environment or .env file.`
        );
    }
    return value;
}

function getEnvAsInt(key: string, defaultValue?: number): number {
    const raw = process.env[key];
    if (raw === undefined) {
        if (defaultValue === undefined) {
            throw new Error(
                `Missing required environment variable: ${key}. Please set it in your environment or .env file.`
            );
        }
        return defaultValue;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
        throw new Error(
            `Environment variable ${key}="${raw}" is not a valid integer.`
        );
    }
    return parsed;
}

function getEnvAsBool(key: string, defaultValue: boolean = false): boolean {
    const raw = process.env[key];
    if (raw === undefined) {
        return defaultValue;
    }
    return raw === 'true' || raw === '1';
}

// Load and validate all config at startup
export const config: Config = {
    // Server
    PORT: getEnvAsInt('PORT', 3001),
    NODE_ENV: getEnv('NODE_ENV', 'development') as Config['NODE_ENV'],

    // CORS
    FRONTEND_URL: getEnv('FRONTEND_URL'),

    // Pagination
    PER_PAGE: getEnvAsInt('PER_PAGE', 10),

    // AWS
    SERVICE_REGION: getEnv('SERVICE_REGION'),
    ACCESS_KEY: getEnv('ACCESS_KEY'),
    SECRET_ACCESS_KEY: getEnv('SECRET_ACCESS_KEY'),
    BUCKET_ACCESS_KEY: getEnv('BUCKET_ACCESS_KEY'),
    BUCKET_SECRET_ACCESS_KEY: getEnv('BUCKET_SECRET_ACCESS_KEY'),
    BUCKET_NAME: getEnv('BUCKET_NAME'),

    // Cognito
    COGNITO_DOMAIN: getEnv('COGNITO_DOMAIN'),
    USE_MOCK_COGNITO: getEnvAsBool('USE_MOCK_COGNITO', false),

    // Database
    DB_HOST: getEnv('DB_HOST'),
    DB_USER: getEnv('DB_USER'),
    DB_PASSWORD: getEnv('DB_PASSWORD'),
    DB_NAME: getEnv('DB_NAME', process.env.DB_DATABASE),
};

// Helper for logging config (masks sensitive values)
export function getConfigSummary(): Record<string, string | number | boolean> {
    return {
        PORT: config.PORT,
        NODE_ENV: config.NODE_ENV,
        FRONTEND_URL: config.FRONTEND_URL,
        PER_PAGE: config.PER_PAGE,
        SERVICE_REGION: config.SERVICE_REGION,
        BUCKET_NAME: config.BUCKET_NAME,
        COGNITO_DOMAIN: config.COGNITO_DOMAIN,
        USE_MOCK_COGNITO: config.USE_MOCK_COGNITO,
        DB_HOST: config.DB_HOST,
        DB_NAME: config.DB_NAME,
        // Sensitive values masked
        ACCESS_KEY: '***',
        SECRET_ACCESS_KEY: '***',
        BUCKET_ACCESS_KEY: '***',
        BUCKET_SECRET_ACCESS_KEY: '***',
        DB_USER: '***',
        DB_PASSWORD: '***',
    };
}
