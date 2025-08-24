import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';

import DB from '../../utils/db-client';

class SchoolController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/sms', verifyToken, this.smsPrioryGet);
        this.router.post('/sms', verifyToken, this.smsPrioryEdit);
        this.router.post('/name', verifyToken, this.schoolNameEdit);
    }

    schoolNameEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { name } = req.body;

            // validate the pirority is boolean
            if (typeof name !== 'string') {
                throw {
                    status: 400,
                    message: 'Invalid school name',
                };
            }

            const school_id = req.user.school_id;

            await DB.execute(
                `UPDATE School SET
                        name = :name
                    WHERE id = :id`,
                {
                    name: name,
                    id: school_id,
                }
            );

            const school = await DB.query(
                `SELECT
                    contact_email, name
                FROM School
                WHERE id = :id;`,
                {
                    id: school_id,
                }
            );

            console.log('result', school);

            return res
                .status(200)
                .json({
                    message: 'School Name updated successfully',
                    school: school[0],
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    smsPrioryGet = async (req: ExtendedRequest, res: Response) => {
        try {
            const school_id = req.user.school_id;

            const schoolInfo = (
                await DB.query(
                    `SELECT
                    contact_email,name,sms_high, sms_medium, sms_low
                FROM School
                WHERE id = :id;`,
                    {
                        id: school_id,
                    }
                )
            )[0];

            return res
                .status(200)
                .json({
                    school: {
                        id: school_id,
                        name: schoolInfo.name,
                        contact_email: schoolInfo.contact_email,
                        priority: {
                            high: !!schoolInfo.sms_high,
                            medium: !!schoolInfo.sms_medium,
                            low: !!schoolInfo.sms_low,
                        },
                    },
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };

    smsPrioryEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { high, medium, low, title } = req.body;

            // validate the pirority is boolean
            if (
                typeof high !== 'boolean' ||
                typeof medium !== 'boolean' ||
                typeof low !== 'boolean'
            ) {
                throw {
                    status: 400,
                    message: 'Invalid priority',
                };
            }

            const school_id = req.user.school_id;

            await DB.execute(
                `UPDATE School SET
                        sms_high = :high, sms_medium = :medium, sms_low = :low, name = :name
                    WHERE id = :id`,
                {
                    high: high ? 1 : 0,
                    medium: medium ? 1 : 0,
                    low: low ? 1 : 0,
                    name: title,
                    id: school_id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'SMS Priority updated successfully',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'Internal server error',
                    })
                    .end();
            }
        }
    };
}

export default SchoolController;
