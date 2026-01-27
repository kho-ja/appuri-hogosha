import express, { Router } from 'express';
import process from 'node:process';

import { IController } from '../../utils/icontroller';
import { Parent } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';

import ParentModuleController from '../../modules/parent/parent.controller';

class ParentController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    private parentModule: ParentModuleController;

    constructor() {
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true'
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
