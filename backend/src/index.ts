import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import createApp from './createApp';

const app = createApp();

export const handler: serverless.Handler = serverless(app, {
    binary: ['multipart/form-data', 'image/*'],
});
