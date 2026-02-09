/**
 * School Controller
 *
 * HTTP layer for School operations
 * Thin controller - delegates to service layer
 */

import { Router, Response, NextFunction } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { schoolService } from './school.service';
import { ApiError } from '../../errors/ApiError';

export class SchoolModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/sms', verifyToken, this.getSmsPriority);
        this.router.post('/sms', verifyToken, this.updateSmsPriority);
        this.router.post('/name', verifyToken, this.updateSchoolName);
    }

    /**
     * GET /sms - Get SMS priority settings
     */
    getSmsPriority = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await schoolService.getSmsPriority(
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * POST /sms - Update SMS priority settings
     */
    updateSmsPriority = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { high, medium, low, title } = req.body;

            // Validate priority is boolean
            if (
                typeof high !== 'boolean' ||
                typeof medium !== 'boolean' ||
                typeof low !== 'boolean'
            ) {
                throw new ApiError(400, 'Invalid priority');
            }

            const result = await schoolService.updateSmsPriority(
                { high, medium, low, title },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * POST /name - Update school name
     */
    updateSchoolName = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { name } = req.body;

            // Validate name is string
            if (typeof name !== 'string') {
                throw new ApiError(400, 'Invalid school name');
            }

            const result = await schoolService.updateSchoolName(
                { name },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };
}

export default SchoolModuleController;
