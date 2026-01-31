import { Router } from 'express';

import mobileFormRouter from '../../modules/mobile/form';
import { IController } from '../../utils/icontroller';

class FormController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileFormRouter);
    }
}

export default FormController;
