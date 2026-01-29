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
    },
}));

describe('Post Module Logic Tests', () => {
    const app = createApp();
    const testToken = '1'; // Used with x-test-auth bypass

    describe('POST /admin-panel/post/create', () => {
        test('Should accept valid base64 image', async () => {
            const res = await request(app)
                .post('/admin-panel/post/create')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Test Title',
                    description: 'Test Description',
                    priority: 'high',
                    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                    students: [1],
                    groups: [],
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('post');
            expect(res.body.post).toHaveProperty('id');
        });

        test('Should reject invalid image format with 400', async () => {
            const res = await request(app)
                .post('/admin-panel/post/create')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Test Title',
                    description: 'Test Description',
                    priority: 'high',
                    image: 'not-a-base64-string',
                    students: [1],
                    groups: [],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('invalid_image_format');
        });
    });

    describe('PUT /admin-panel/post/:id', () => {
        test('Should remove image when empty string is sent', async () => {
            // Setup: mock findById to return a post with an image
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    title: 'Old Title',
                    image: 'existing-image.png',
                    school_id: 1,
                },
            ]);

            const res = await request(app)
                .put('/admin-panel/post/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    image: '', // This should trigger removal
                });

            expect(res.status).toBe(200);
            // Verify that execute was called with null for image
            expect(DB.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Post'),
                expect.objectContaining({ image: null })
            );
        });

        test('Should keep image when same filename is sent', async () => {
            const DB = require('../src/utils/db-client').default;
            DB.query.mockResolvedValueOnce([
                {
                    id: 1,
                    title: 'Old Title',
                    image: 'same-image.png',
                    school_id: 1,
                },
            ]);

            const res = await request(app)
                .put('/admin-panel/post/1')
                .set('x-test-auth', testToken)
                .send({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    priority: 'medium',
                    image: 'same-image.png',
                });

            expect(res.status).toBe(200);
            expect(DB.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Post'),
                expect.objectContaining({ image: 'same-image.png' })
            );
        });
    });
});
