import {IController} from '../utils/icontroller';
import express, {Request, Response, Router} from "express";
import {Admin} from '../utils/cognito-client';
import {MockCognitoClient} from '../utils/mock-cognito-client';
import DB from '../utils/db-client';
import {ExtendedRequest, verifyToken} from '../middlewares/auth'

class AuthController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;

    constructor() {
        this.cognitoClient = process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/login', this.login)
        this.router.post('/refresh-token', this.refreshToken)
        this.router.post('/change-temp-password', this.changeTemporaryPassword)
        this.router.get('/protected-route', verifyToken, this.protectedRoute);
    }

    login = async (req: Request, res: Response) => {
        try {
            const {email, password} = req.body;
            const authData = await this.cognitoClient.login(email, password);

            const admins = await DB.query(`SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`, {
                email: email
            });

            if (admins.length <= 0) {
                throw {
                    status: 401,
                    message: 'Invalid email or password'
                };
            }

            const admin = admins[0];

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: authData.refreshToken,
                user: {
                    id: admin.id,
                    email: admin.email,
                    phone_number: admin.phone_number,
                    given_name: admin.given_name,
                    family_name: admin.family_name,
                },
                school_name: admin.school_name,
            }).end();
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

    refreshToken = async (req: Request, res: Response) => {
        try {
            const {refresh_token} = req.body;
            const authData = await this.cognitoClient.refreshToken(refresh_token);

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: refresh_token,
            }).end();
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

    changeTemporaryPassword = async (req: Request, res: Response) => {
        try {
            const {email, temp_password, new_password} = req.body;
            const authData = await this.cognitoClient.changeTempPassword(email, temp_password, new_password);

            const admins = await DB.query(`SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`, {
                email: email
            });

            if (admins.length <= 0) {
                throw {
                    status: 401,
                    message: 'Invalid email or password'
                };
            }

            const admin = admins[0];

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: authData.refreshToken,
                user: {
                    id: admin.id,
                    email: admin.email,
                    phone_number: admin.phone_number,
                    given_name: admin.given_name,
                    family_name: admin.family_name,
                },
                school_name: admin.school_name,
            }).end();
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

    protectedRoute = async (req: ExtendedRequest, res: Response) => {
        return res.status(200).json({
            message: 'You have accessed a protected route',
            user: req.user
        }).end();
    }
}

export default AuthController