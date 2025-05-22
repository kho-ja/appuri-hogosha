import { IController } from '../../utils/icontroller';
import express, { Request, Response, Router } from "express";
import { Parent } from '../../utils/cognito-client'
import DB from '../../utils/db-client'
// import {ParentsSNS} from '../../utils/sns-client'
import { verifyToken, ExtendedRequest } from "../../middlewares/mobileAuth";
import { MockCognitoClient } from "../../utils/mock-cognito-client";

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

    private normalizeToken(raw: any): string | null {
        if (!raw) return null;
        if (typeof raw === 'string') return raw.trim();
        if (typeof raw === 'object' && typeof raw.data === 'string') return raw.data.trim();
        return null;
    }

    deviceToken = async (req: ExtendedRequest, res: Response) => {
        try {
            const { token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            if (normalizedToken == null || normalizedToken == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid Device Token'
                }
            }

            await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                id: req.user.id,
                arn: normalizedToken
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
            const { previous_password, new_password } = req.body;
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
            const { phone_number, password, token } = req.body;
            const normalizedToken = this.normalizeToken(token);
            const authData = await this.cognitoClient.login(phone_number, password)

            const parents = await DB.query(`SELECT
                pa.id,pa.phone_number,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`, {
                phone_number: phone_number.slice(1)
            });

            if (parents.length <= 0 || normalizedToken == null || normalizedToken == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid phone_number or password'
                }
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                    id: parent.id,
                    arn: normalizedToken
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
            const { refresh_token } = req.body;
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
            const { phone_number, temp_password, new_password, token } = req.body
            const normalizedToken = this.normalizeToken(token);
            const authData = await this.cognitoClient.changeTempPassword(phone_number, temp_password, new_password)

            const parents = await DB.query(`SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`, {
                phone_number: phone_number.slice(1)
            });


            if (parents.length <= 0 || normalizedToken == null || normalizedToken == '[object Object]') {
                throw {
                    status: 401,
                    message: 'Invalid phone number or password'
                }
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                    id: parent.id,
                    arn: normalizedToken
                })
            } catch (error) {
                console.error('Error during updating device token:', error);
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
            console.error('Error during sign in in auth:', e);
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