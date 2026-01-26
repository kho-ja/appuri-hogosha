import { IController } from '../../utils/icontroller';
import { Router } from 'express';

import StudentModuleController from '../../modules/student/student.controller';

class StudentController implements IController {
    public router: Router = Router();
    private studentModule: StudentModuleController;

    constructor() {
        this.studentModule = new StudentModuleController();
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.studentModule.router);
    }
}

export default StudentController;
