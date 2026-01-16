/**
 * Admin Controller
 *
 * HTTP layer for Admin operations
 * Thin controller - delegates to service layer
 */

import { Router, Response } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { AdminService } from './admin.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidEmail,
    isValidId,
    isValidPhoneNumber,
    isValidString,
} from '../../utils/validate';

export class AdminModuleController implements IController {
    public router: Router = Router();
    private adminService: AdminService;

    constructor(cognitoClient: any) {
        this.adminService = new AdminService(cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        // CRUD endpoints
        this.router.post('/create', verifyToken, this.createAdmin);
        this.router.post('/list', verifyToken, this.getAdminList);
        this.router.get('/:id', verifyToken, this.getAdminDetail);
        this.router.post(
            '/get-details',
            verifyToken,
            this.getAdminDetailSecure
        );
        this.router.put('/:id', verifyToken, this.updateAdmin);
        this.router.delete('/:id', verifyToken, this.deleteAdmin);
    }

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create admin
     */
    createAdmin = async (req: ExtendedRequest, res: Response) => {
        try {
            const { email, phone_number, given_name, family_name } = req.body;

            if (!email || !isValidEmail(email)) {
                throw new ApiError(401, 'invalid_or_missing_email');
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(401, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(401, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(401, 'invalid_or_missing_family_name');
            }

            const result = await this.adminService.createAdmin(
                { email, phone_number, given_name, family_name },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * POST /list - Get admin list with pagination
     */
    getAdminList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';

            const result = await this.adminService.getAdminList(
                { page, email, phone_number, name },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id - Get admin detail
     */
    getAdminDetail = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw new ApiError(401, 'invalid_or_missing_admin_id');
            }

            const result = await this.adminService.getAdminDetail(
                parseInt(adminId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * POST /get-details - Get admin detail (secure POST version)
     */
    getAdminDetailSecure = async (req: ExtendedRequest, res: Response) => {
        try {
            const { adminId } = req.body;

            if (!adminId || !isValidId(adminId)) {
                throw new ApiError(400, 'invalid_or_missing_admin_id');
            }

            const result = await this.adminService.getAdminDetail(
                parseInt(adminId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * PUT /:id - Update admin
     */
    updateAdmin = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;
            const { phone_number, given_name, family_name } = req.body;

            if (!adminId || !isValidId(adminId)) {
                throw new ApiError(401, 'invalid_or_missing_admin_id');
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(401, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(401, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(401, 'invalid_or_missing_family_name');
            }

            const result = await this.adminService.updateAdmin(
                parseInt(adminId),
                { phone_number, given_name, family_name },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * DELETE /:id - Delete admin
     */
    deleteAdmin = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw new ApiError(401, 'invalid_or_missing_admin_id');
            }

            const result = await this.adminService.deleteAdmin(
                parseInt(adminId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };
}

export default AdminModuleController;
