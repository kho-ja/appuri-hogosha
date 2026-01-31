import request from 'supertest';
import createApp from '../src/createApp';

// Mock DB and S3 to avoid real infrastructure dependencies
jest.mock('../src/utils/db-client', () => ({
    __esModule: true,
    default: {
        query: jest.fn(async () => []),
        execute: jest.fn(async () => ({ insertId: 1 })),
    },
}));

jest.mock('../src/utils/s3-client', () => ({
    Images3Client: {
        uploadFile: jest.fn(async () => true),
        deleteFile: jest.fn(async () => true),
    },
}));

describe('Scheduled Post Module Logic Tests', () => {
    const app = createApp();
    const testToken = '1'; // Used with x-test-auth bypass

    beforeEach(() => {
        const DB = require('../src/utils/db-client').default;
        DB.query.mockReset();
        DB.execute.mockReset();
        DB.query.mockResolvedValue([]);
        DB.execute.mockResolvedValue({ insertId: 1 });

        const { Images3Client } = require('../src/utils/s3-client');
        Images3Client.uploadFile.mockClear();
        Images3Client.deleteFile.mockClear();
    });

    describe('POST /admin-panel/schedule', () => {
        test('Should accept valid base64 image', async () => {
            const res = await request(app)
                .post('/admin-panel/schedule')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Scheduled Title',
                    description: 'Scheduled Description',
                    priority: 'high',
                    students: [],
                    groups: [],
                    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('post');
            expect(res.body.post).toHaveProperty('title', 'Scheduled Title');

            const { Images3Client } = require('../src/utils/s3-client');
            expect(Images3Client.uploadFile).toHaveBeenCalled();
        });

        test('Should accept safe uploaded filename image', async () => {
            const safeName = `${'a'.repeat(64)}.png`;
            const res = await request(app)
                .post('/admin-panel/schedule')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Scheduled Title',
                    description: 'Scheduled Description',
                    priority: 'high',
                    students: [],
                    groups: [],
                    image: safeName,
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                });

            expect(res.status).toBe(200);

            const { Images3Client } = require('../src/utils/s3-client');
            expect(Images3Client.uploadFile).not.toHaveBeenCalled();
        });

        test('Should accept full URL image (extract safe filename)', async () => {
            const safeName = `${'b'.repeat(64)}.webp`;
            const res = await request(app)
                .post('/admin-panel/schedule')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Scheduled Title',
                    description: 'Scheduled Description',
                    priority: 'high',
                    students: [],
                    groups: [],
                    image: `https://cdn.example.com/images/${safeName}`,
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                });

            expect(res.status).toBe(200);

            const { Images3Client } = require('../src/utils/s3-client');
            expect(Images3Client.uploadFile).not.toHaveBeenCalled();
        });

        test('Should reject invalid image format with 400', async () => {
            const res = await request(app)
                .post('/admin-panel/schedule')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Scheduled Title',
                    description: 'Scheduled Description',
                    priority: 'high',
                    students: [],
                    groups: [],
                    image: 'not-a-base64-string',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('invalid_image_format');
        });
    });

    describe('PUT /admin-panel/schedule/:id', () => {
        test('Should remove image when empty string is sent', async () => {
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    image: 'existing-image.png',
                },
            ]);

            const res = await request(app)
                .put('/admin-panel/schedule/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                    image: '',
                });

            expect(res.status).toBe(200);
            expect(DB.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE scheduledPost'),
                expect.objectContaining({ image: null })
            );
        });

        test('Should keep image when same filename is sent', async () => {
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    image: 'same-image.png',
                },
            ]);

            const res = await request(app)
                .put('/admin-panel/schedule/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                    image: 'same-image.png',
                });

            expect(res.status).toBe(200);
            expect(DB.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE scheduledPost'),
                expect.objectContaining({ image: 'same-image.png' })
            );
        });

        test('Should accept data URL image on edit (webp)', async () => {
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    image: null,
                },
            ]);

            const res = await request(app)
                .put('/admin-panel/schedule/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                    image: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=',
                });

            expect(res.status).toBe(200);

            const { Images3Client } = require('../src/utils/s3-client');
            expect(Images3Client.uploadFile).toHaveBeenCalled();
        });

        test('Should accept safe filename extracted from full URL', async () => {
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    image: null,
                },
            ]);

            const safeName = `${'a'.repeat(64)}.png`;
            const res = await request(app)
                .put('/admin-panel/schedule/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    scheduled_at: '2026-01-30T10:00:00.000Z',
                    image: `https://cdn.example.com/images/${safeName}`,
                });

            expect(res.status).toBe(200);
            expect(DB.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE scheduledPost'),
                expect.objectContaining({ image: safeName })
            );
        });
    });
});
