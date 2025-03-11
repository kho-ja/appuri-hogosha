import {IController} from '../utils/icontroller';
import express, {Request, Response, Router} from "express";
import {Parent} from "../utils/cognito-client"
import {verifyToken, ExtendedRequest} from "../middlewares/auth";
import {MockCognitoClient} from "../utils/mock-cognito-client";

class ParentController implements IController {
    public router: Router = express.Router();
    public cognitoClient:any;

    constructor() {
        this.cognitoClient = process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Parent;
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.get('/parent', verifyToken, this.parentInfo)
        this.router.post('/change-password', verifyToken, this.changePassword)
    }

    changePassword = async (req: ExtendedRequest, res: Response) => {
        try {
            const {old_password, new_password} = req.body;
            await this.cognitoClient.changePassword(req.token, old_password, new_password)

            return res.status(200).json({
                message: 'Successfully changed password'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    parentInfo = (req: ExtendedRequest, res: Response) => {
        const {id, email, phone_number, given_name, family_name} = req.user;
        res.status(200).json({
            id, email, phone_number, given_name, family_name
        }).end()
    }
}

export default ParentController