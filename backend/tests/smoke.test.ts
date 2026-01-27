import request from 'supertest';

import createApp from '../src/createApp';

jest.mock('../src/utils/db-client', () => ({
    __esModule: true,
    default: {
        query: jest.fn(async (sql: string) => {
            const normalizedSql = sql.toLowerCase();
            if (normalizedSql.includes('count(*) as total')) {
                return [{ total: 0 }];
            }
            return [];
        }),
        execute: jest.fn(async () => ({ insertId: 1 })),
    },
}));

describe('backend smoke tests', () => {
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

        expect(res.status).toBe(500);
        expect(res.body).toEqual(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    statusCode: 500,
                }),
            })
        );
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('Protected endpoint works with verifyToken test bypass', async () => {
        const res = await request(app)
            .get('/__test/protected')
            .set('x-test-auth', '1');
        expect(res.status).toBe(200);
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
            .get('/admin-panel/student/template')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment');
    });

    test('Parent CSV template endpoint returns a CSV file', async () => {
        const res = await request(app)
            .get('/admin-panel/parent/template')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment');
    });

    test('Schedule list endpoint returns stable shape', async () => {
        const res = await request(app)
            .get('/admin-panel/schedule/list')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(
            expect.objectContaining({
                scheduledPosts: expect.any(Array),
                pagination: expect.any(Object),
            })
        );
    });
});
