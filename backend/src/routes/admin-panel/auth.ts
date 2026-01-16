import { IController } from '../../utils/icontroller';
import { Router } from 'express';
import authModuleRouter from '../../modules/auth';

class AuthController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // All auth endpoints migrated to auth module
        this.router.use('/', authModuleRouter);
    }
}

export default AuthController;
