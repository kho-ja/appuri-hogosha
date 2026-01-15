import AdminPanelController from './routes/admin-panel';
import MobileController from './routes/mobile';
import App from './utils/app';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export default function createApp() {
    const app = new App([new AdminPanelController(), new MobileController()]);

    // Register error handlers AFTER all routes
    app.app.use(notFoundHandler);
    app.app.use(errorHandler);

    return app.app;
}
