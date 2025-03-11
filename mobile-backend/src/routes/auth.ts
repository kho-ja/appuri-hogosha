import {IController} from '../utils/icontroller';
import express, {Request, Response, Router} from "express";
import {Parent} from '../utils/cognito-client'
import DB from '../utils/db-client'
// import {ParentsSNS} from '../utils/sns-client'
import {verifyToken, ExtendedRequest} from "../middlewares/auth";
import {MockCognitoClient} from "../utils/mock-cognito-client";

class AuthController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;

    constructor() {
        this.cognitoClient = process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Parent;
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/login', this.login)
        this.router.post('/refresh-token', this.refreshToken)
        this.router.post('/change-temp-password', this.changeTemporaryPassword)
        this.router.post('/change-password', verifyToken, this.changePassword)
        this.router.post('/device-token', verifyToken, this.deviceToken)
    }

    deviceToken = async (req: ExtendedRequest, res: Response) => {
        try {
            const {token} = req.body;

            if (token == null || token == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid Device Token'
                }
            }

            await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                id: req.user.id,
                arn: token
            })

            return res.status(200).json({
                message: 'Device token updated successfully',
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

    changePassword = async (req: ExtendedRequest, res: Response) => {
        try {
            const {previous_password, new_password} = req.body;
            await this.cognitoClient.changePassword(req.token, previous_password, new_password);

            return res.status(200).json({
                message: 'Password changed successfully',
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

    login = async (req: Request, res: Response) => {
        try {
            const {email, password, token} = req.body;
            const authData = await this.cognitoClient.login(email, password)


            const parents = await DB.query(`SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.email = :email`, {
                email: email
            });

            if (parents.length <= 0 || token == null || token == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid email or password'
                }
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                    id: parent.id,
                    arn: token
                })
            } catch (error) {
            }

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: authData.refreshToken,
                user: {
                    id: parents.id,
                    email: parent.email,
                    phone_number: parent.phone_number,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                },
                school_name: parent.school_name,
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

    refreshToken = async (req: Request, res: Response) => {
        try {
            const {refresh_token} = req.body;
            const authData = await this.cognitoClient.refreshToken(refresh_token)

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: refresh_token,
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

    changeTemporaryPassword = async (req: Request, res: Response) => {
        try {
            const {email, temp_password, new_password, token} = req.body
            const authData = await this.cognitoClient.changeTempPassword(email, temp_password, new_password)

            const parents = await DB.query(`SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.email = :email`, {
                email: email
            });


            if (parents.length <= 0 || token == null || token == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid email or password'
                }
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                    id: parent.id,
                    arn: token
                })
            } catch (error) {
            }

            return res.status(200).json({
                access_token: authData.accessToken,
                refresh_token: authData.refreshToken,
                user: {
                    id: parent.id,
                    email: parent.email,
                    phone_number: parent.phone_number,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                },
                school_name: parent.school_name,
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
}

export default AuthController