import { NextFunction, Request, Response } from "express";
import { Parent } from '../utils/cognito-client';
import { MockCognitoClient } from '../utils/mock-cognito-client'
import DB from '../utils/db-client'

const bearerRegex = /^Bearer .+$/;

export interface ExtendedRequest extends Request {
    [k: string]: any
}

export const verifyToken = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !bearerRegex.test(authHeader)) {
        return res.status(401).json({
            error: 'Access token is missing or invalid.',
        }).end();
    }

    const token = authHeader.split(' ')[1];
    const cognitoClient = process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Parent;

    try {
        const userData = await cognitoClient.accessToken(token);
        const parents = await DB.query(`SELECT * FROM Parent as pa
            WHERE pa.phone_number = :phone_number and pa.cognito_sub_id = :sub_id`, {
            phone_number: userData.phone_number.slice(1),
            sub_id: userData.sub_id,
        })

        if (parents.length <= 0) {
            throw {
                status: 401,
                message: 'Invalid access token'
            }
        }

        const parent = parents[0];

        req.user = parent;
        req.token = token
        return next()
    } catch (e: any) {
        if (e.status) {
            return res.status(e.status).json({
                message: e.message
            }).end();
        }
        return res.status(500).json({
            message: 'Internal server error'
        }).end();
    }
}