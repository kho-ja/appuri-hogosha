import AdminPanelController from './routes/admin-panel';
import MobileController from './routes/mobile';
import App from './utils/app';

export default function createApp() {
    const app = new App([new AdminPanelController(), new MobileController()]);
    return app.app;
}
