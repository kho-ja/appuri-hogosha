// Jest global setup for backend smoke tests.
// IMPORTANT: config is evaluated at import-time, so env must be set here.

process.env.NODE_ENV = 'test';

// Server
process.env.PORT = '0';

// CORS (used by utils/app.ts)
process.env.FRONTEND_URL = 'http://localhost:3000';

// Pagination
process.env.PER_PAGE = '10';

// AWS (not used by smoke tests but required by config validation)
process.env.SERVICE_REGION = 'us-east-1';
process.env.ACCESS_KEY = 'test';
process.env.SECRET_ACCESS_KEY = 'test';
process.env.BUCKET_ACCESS_KEY = 'test';
process.env.BUCKET_SECRET_ACCESS_KEY = 'test';
process.env.BUCKET_NAME = 'test-bucket';

// Cognito
process.env.COGNITO_DOMAIN = 'https://example.invalid';
process.env.USE_MOCK_COGNITO = 'true';

// Database (not used by smoke tests but required by config validation)
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
