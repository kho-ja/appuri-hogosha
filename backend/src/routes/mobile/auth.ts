import { Router } from 'express';

import mobileAuthRouter from '../../modules/mobile/auth';
import { IController } from '../../utils/icontroller';

class AuthController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileAuthRouter);
    }
}

export default AuthController;
