import express, { Router } from 'express';
import { IController } from '../../utils/icontroller';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import AdminModuleController from '../../modules/admin/admin.controller';
import { config } from '../../config';

class AdminController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    private adminModule: AdminModuleController;

    constructor() {
        this.cognitoClient = config.USE_MOCK_COGNITO
            ? MockCognitoClient
            : Admin;

        this.adminModule = new AdminModuleController(this.cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.adminModule.router);
    }
}

export default AdminController;
