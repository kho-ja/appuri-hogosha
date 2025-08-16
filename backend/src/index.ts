import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import App from './utils/app';
import AdminPanelController from './routes/admin-panel';
import MobileController from './routes/mobile';

const app = new App([new AdminPanelController(), new MobileController()]);

export const handler: serverless.Handler = serverless(app.listen());
