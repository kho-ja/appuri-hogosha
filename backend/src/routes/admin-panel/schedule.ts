import { IController } from '../../utils/icontroller';
import { Router } from 'express';
import scheduleModuleRouter from '../../modules/schedule';

class SchedulePostController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', scheduleModuleRouter);
    }
}

export default SchedulePostController;
