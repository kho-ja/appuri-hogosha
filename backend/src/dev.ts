import dotenv from 'dotenv';
dotenv.config();

import createApp from './createApp';
import { config, getConfigSummary } from './config';

const app = createApp();

// Log config summary on startup (with sensitive values masked)
console.log('Server configuration:', getConfigSummary());

app.listen(config.PORT, () => {
    console.log(`Server running on http://127.0.0.1:${config.PORT}/`);
    console.log(`Environment: ${config.NODE_ENV}`);
});
