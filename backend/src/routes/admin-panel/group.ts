import express, { Router } from 'express';

import { IController } from '../../utils/icontroller';

import GroupModuleController from '../../modules/group/group.controller';

class GroupController implements IController {
    public router: Router = express.Router();
    private groupModule: GroupModuleController;

    constructor() {
        this.groupModule = new GroupModuleController();
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.groupModule.router);
    }
}

export default GroupController;
