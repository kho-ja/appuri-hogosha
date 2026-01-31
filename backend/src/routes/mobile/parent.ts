import { Router } from 'express';

import mobileParentRouter from '../../modules/mobile/parent';
import { IController } from '../../utils/icontroller';

class ParentController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileParentRouter);
    }
}

export default ParentController;
