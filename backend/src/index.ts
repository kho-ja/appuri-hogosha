import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import createApp from './createApp';

const app = new App([new AdminPanelController(), new MobileController()]);

export const handler: serverless.Handler = serverless(app.listen(), {
    binary: ['multipart/form-data', 'image/*'],
});
