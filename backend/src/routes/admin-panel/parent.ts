import express, { Router } from 'express';
import { IController } from '../../utils/icontroller';
import { Parent } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import ParentModuleController from '../../modules/parent/parent.controller';
import { config } from '../../config';

class ParentController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    private parentModule: ParentModuleController;

    constructor() {
        this.cognitoClient = config.USE_MOCK_COGNITO
            ? MockCognitoClient
            : Parent;

        this.parentModule = new ParentModuleController(this.cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.parentModule.router);
    }
}

export default ParentController;
