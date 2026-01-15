import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import createApp from './createApp';

export const handler: serverless.Handler = serverless(createApp());
