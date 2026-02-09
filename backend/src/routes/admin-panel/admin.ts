import express, { Router } from 'express';
import process from 'node:process';

import { IController } from '../../utils/icontroller';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';

import AdminModuleController from '../../modules/admin/admin.controller';

class AdminController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    private adminModule: AdminModuleController;

    constructor() {
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;

        this.adminModule = new AdminModuleController(this.cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.adminModule.router);
    }
}

export default AdminController;
