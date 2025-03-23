import {Router} from "express";

export interface IController {
    path?: string;
    router: Router;
    initRoutes: () => void;
    cognitoClient?: any
}