import express, { Router } from 'express';

import { IController } from '../../utils/icontroller';

import SchoolModuleController from '../../modules/school/school.controller';

class SchoolController implements IController {
    public router: Router = express.Router();
    private schoolModule: SchoolModuleController;

    constructor() {
        this.schoolModule = new SchoolModuleController();
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.schoolModule.router);
    }
}

export default SchoolController;
