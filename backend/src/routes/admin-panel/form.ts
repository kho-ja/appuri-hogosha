import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router, NextFunction } from 'express';

import { isValidStatus, isValidId, isValidReason } from '../../utils/validate';
import { ApiError } from '../../errors/ApiError';
import { formService } from '../../services/form.service';

class FormController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/list', verifyToken, this.formList);
        this.router.get('/count', verifyToken, this.formCount);
        this.router.get('/:id', verifyToken, this.formView);
        this.router.put('/:id', verifyToken, this.formEdit);
    }

    formCount = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // Call service layer
            const result = await formService.getFormCount({
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    formList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // Parse and validate request
            const page = parseInt(req.query.page as string) || 1;
            const reason = (req.query.reason as string) || '';
            const status = (req.query.status as string) || '';

            // Validate filters
            if (reason && !isValidReason(reason)) {
                throw ApiError.badRequest('Invalid reason filter');
            }
            if (status && !isValidStatus(status)) {
                throw ApiError.badRequest('Invalid status filter');
            }

            // Call service layer
            const result = await formService.getFormList({
                schoolId: req.user.school_id,
                page,
                reason: reason || undefined,
                status: status || undefined,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    formView = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // Parse and validate request
            const formId = req.params.id;

            if (!formId || !isValidId(formId)) {
                throw ApiError.badRequest('Invalid or missing form id');
            }

            // Call service layer
            const result = await formService.getFormDetail({
                formId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    formEdit = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            // Parse and validate request
            const { status } = req.body;
            const formId = req.params.id;

            if (!status || !isValidStatus(status)) {
                throw ApiError.badRequest('Invalid or missing status');
            }

            if (!formId || !isValidId(formId)) {
                throw ApiError.badRequest('Invalid or missing form id');
            }

            // Call service layer
            const result = await formService.updateFormStatus({
                formId,
                schoolId: req.user.school_id,
                status,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };
}

export default FormController;
