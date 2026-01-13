import request from 'supertest';

jest.mock('../src/utils/db-client', () => ({
    __esModule: true,
    default: {
        query: jest.fn(async (sql: string) => {
            if (sql.includes('COUNT(*) as total')) {
                return [{ total: 0 }];
            }
            return [];
        }),
        execute: jest.fn(async () => ({ insertId: 1 })),
    },
}));

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL =
    process.env.FRONTEND_URL ?? 'https://allowed.example';

// Some modules create AWS SDK clients at import-time; provide safe dummy config for tests.
process.env.SERVICE_REGION = process.env.SERVICE_REGION ?? 'us-east-1';
process.env.ACCESS_KEY = process.env.ACCESS_KEY ?? 'test';
process.env.SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY ?? 'test';
process.env.BUCKET_ACCESS_KEY = process.env.BUCKET_ACCESS_KEY ?? 'test';
process.env.BUCKET_SECRET_ACCESS_KEY =
    process.env.BUCKET_SECRET_ACCESS_KEY ?? 'test';
process.env.BUCKET_NAME = process.env.BUCKET_NAME ?? 'test-bucket';
process.env.COGNITO_DOMAIN =
    process.env.COGNITO_DOMAIN ?? 'https://example.com';

describe('backend smoke tests', () => {
    const createApp = require('../src/createApp').default as () => any;
    const app = createApp();

    test('GET /health returns ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('time');
    });

    test('CORS preflight allows configured origin', async () => {
        const origin = process.env.FRONTEND_URL as string;
        const res = await request(app)
            .options('/health')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'GET');

        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    test('CORS preflight blocks unknown origin', async () => {
        const res = await request(app)
            .options('/health')
            .set('Origin', 'https://blocked.example')
            .set('Access-Control-Request-Method', 'GET');

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('Protected endpoint works with verifyToken stub', async () => {
        const res = await request(app)
            .get('/admin-panel/protected-route')
            .set('x-test-auth', '1');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty(
            'message',
            'You have accessed a protected route'
        );
        expect(res.body).toHaveProperty('user');
    });

    test('DB-backed endpoint returns stable shape (form count)', async () => {
        const res = await request(app)
            .get('/admin-panel/form/count')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ form_count: 0 });
    });

    test('CSV template endpoint returns a CSV file', async () => {
        const res = await request(app)
            .get('/admin-panel/group/template')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.text).toContain('name,parent_group_name,student_numbers');
    });
});
