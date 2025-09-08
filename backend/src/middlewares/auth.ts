import { NextFunction, Request, Response } from 'express';
import { Admin } from '../utils/cognito-client';
import { MockCognitoClient } from '../utils/mock-cognito-client';
import DB from '../utils/db-client';

const bearerRegex = /^Bearer .+$/;

export interface ExtendedRequest extends Request {
    [k: string]: any;
}

export const verifyToken = async (
    req: ExtendedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !bearerRegex.test(authHeader)) {
        return res
            .status(401)
            .json({
                error: 'Access token is missing or invalid.',
            })
            .end();
    }

    const token = authHeader.split(' ')[1];
    const cognitoClient =
        process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;

    try {
        let userData;
        try {
            userData = await cognitoClient.accessToken(token);
        } catch (err: any) {
            // Fallback for OAuth access tokens from Cognito Hosted UI (Google): use userInfo endpoint
            if (err?.status === 401) {
                const resp = await fetch(
                    `${process.env.COGNITO_DOMAIN}/oauth2/userInfo`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (!resp.ok) {
                    throw err;
                }
                const data = await resp.json();
                userData = {
                    email: data.email ?? '',
                    sub_id: data.sub ?? '',
                    phone_number: data.phone_number ?? '',
                };
            } else {
                throw err;
            }
        }

        const admins = await DB.query(
            `SELECT * FROM Admin as ad
            WHERE ad.email = :email and ad.cognito_sub_id = :sub_id`,
            {
                email: userData.email,
                sub_id: userData.sub_id,
            }
        );

        if (admins.length <= 0) {
            throw {
                status: 401,
                message: 'Invalid access token',
            };
        }

        const admin = admins[0];

        req.user = admin;
        req.token = token;
        return next();
    } catch (e: any) {
        if (e.status) {
            return res
                .status(e.status)
                .json({
                    message: e.message,
                })
                .end();
        }
        return res
            .status(500)
            .json({
                message: 'Internal server error',
            })
            .end();
    }
};
