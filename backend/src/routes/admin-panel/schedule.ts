import express, { Router } from 'express';

import scheduleModuleRouter from '../../modules/schedule';
import { IController } from '../../utils/icontroller';

class SchedulePostController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', scheduleModuleRouter);
    }
}

export default SchedulePostController;
