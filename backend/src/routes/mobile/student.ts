import { Router } from 'express';

import mobileStudentRouter from '../../modules/mobile/student';
import { IController } from '../../utils/icontroller';

class StudentController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobileStudentRouter);
    }
}

export default StudentController;
