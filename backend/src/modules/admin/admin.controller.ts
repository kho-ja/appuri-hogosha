/**
 * Admin Controller
 *
 * HTTP layer for Admin operations
 * Thin controller - delegates to service layer
 */

import { NextFunction, Router, Response } from 'express';
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
import DB from '../../utils/db-client';
import { stringify } from 'csv-stringify/sync';
import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    RowError,
    CSVRowBase,
    bumpSummary,
    handleCSVUpload,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';

export class AdminModuleController implements IController {
    public router: Router = Router();
    private adminService: AdminService;
    public cognitoClient: any;

    constructor(cognitoClient: any) {
        this.cognitoClient = cognitoClient;
        this.adminService = new AdminService(cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        // CSV operations (must be before /:id routes)
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadAdminsFromCSV
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportAdminsToCSV);

        // CRUD endpoints
        this.router.post('/create', verifyToken, this.createAdmin);
        this.router.post('/list', verifyToken, this.getAdminList);
        this.router.get('/:id', verifyToken, this.getAdminDetail);
        this.router.post(
            '/get-details',
            verifyToken,
            this.getAdminDetailSecure
        );
        this.router.post(
            '/:id/resend-password',
            verifyToken,
            this.resendTemporaryPassword
        );
        this.router.put('/:id', verifyToken, this.updateAdmin);
        this.router.delete('/:id', verifyToken, this.deleteAdmin);
    }

    uploadAdminsFromCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { throwInError, action, withCSV } = req.body;
        const throwInErrorBool = throwInError === 'true';
        const withCSVBool = withCSV === 'true';

        if (!req.file || !req.file.buffer) {
            return res
                .status(400)
                .json(createErrorResponse(ErrorKeys.file_missing))
                .end();
        }

        const response = createBaseResponse<any>();
        try {
            const rawRows = await parseCSVBuffer(req.file.buffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return res.status(200).json(response).end();
            }

            const valid: any[] = [];
            const errors: RowError<CSVRowBase>[] = [];
            const emailsInFile: Set<string> = new Set();

            for (const row of rawRows) {
                const normalized = {
                    email: String(row.email || '').trim(),
                    phone_number: String(row.phone_number || '').trim(),
                    given_name: String(row.given_name || '').trim(),
                    family_name: String(row.family_name || '').trim(),
                };
                const rowErrors: Record<string, string> = {};

                if (!isValidEmail(normalized.email))
                    rowErrors.email = ErrorKeys.invalid_email;
                if (!isValidPhoneNumber(normalized.phone_number))
                    rowErrors.phone_number = ErrorKeys.invalid_phone_number;
                if (!isValidString(normalized.given_name))
                    rowErrors.given_name = ErrorKeys.invalid_given_name;
                if (!isValidString(normalized.family_name))
                    rowErrors.family_name = ErrorKeys.invalid_family_name;
                if (emailsInFile.has(normalized.email))
                    rowErrors.email = ErrorKeys.email_already_exists;

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({ row: normalized, errors: rowErrors });
                } else {
                    emailsInFile.add(normalized.email);
                    valid.push(normalized);
                }
            }

            if (errors.length > 0) {
                if (throwInErrorBool) {
                    response.errors = errors;
                    response.summary.errors = errors.length;
                    return res.status(400).json(response).end();
                }
                response.errors.push(...errors);
            }

            if (!action || !['create', 'update', 'delete'].includes(action)) {
                return res
                    .status(400)
                    .json(
                        createErrorResponse(
                            ErrorKeys.server_error,
                            'invalid_action'
                        )
                    )
                    .end();
            }

            const existingAdmins = await DB.query(
                'SELECT email FROM Admin WHERE email IN (:emails)',
                { emails: valid.map(r => r.email) }
            );
            const existingEmailSet = new Set(
                existingAdmins.map((a: any) => a.email)
            );

            for (const row of valid) {
                if (action === 'create') {
                    if (existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: { email: ErrorKeys.admin_already_exists },
                        });
                        continue;
                    }
                    const admin = await this.cognitoClient.register(row.email);
                    await DB.execute(
                        `INSERT INTO Admin(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
                        VALUE (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id);`,
                        {
                            cognito_sub_id: admin.sub_id,
                            email: row.email,
                            phone_number: row.phone_number,
                            given_name: row.given_name,
                            family_name: row.family_name,
                            school_id: req.user.school_id,
                        }
                    );
                    response.inserted.push(row);
                } else if (action === 'update') {
                    if (!existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: { email: ErrorKeys.admin_does_not_exist },
                        });
                        continue;
                    }
                    await DB.execute(
                        `UPDATE Admin SET
                            phone_number = :phone_number,
                            given_name = :given_name,
                            family_name = :family_name
                         WHERE email = :email AND school_id = :school_id`,
                        {
                            email: row.email,
                            phone_number: row.phone_number,
                            given_name: row.given_name,
                            family_name: row.family_name,
                            school_id: req.user.school_id,
                        }
                    );
                    response.updated.push(row);
                } else if (action === 'delete') {
                    if (!existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: { email: ErrorKeys.admin_does_not_exist },
                        });
                        continue;
                    }
                    await this.cognitoClient.delete(row.email);
                    await DB.execute(
                        'DELETE FROM Admin WHERE email = :email AND school_id = :school_id',
                        { email: row.email, school_id: req.user.school_id }
                    );
                    response.deleted.push(row);
                }
            }

            bumpSummary(response, 'inserted');
            bumpSummary(response, 'updated');
            bumpSummary(response, 'deleted');
            response.summary.errors = response.errors.length;

            finalizeResponse(response, withCSVBool);
            return res
                .status(response.errors.length ? 400 : 200)
                .json(response)
                .end();
        } catch (e: any) {
            return next(e);
        }
    };

    exportAdminsToCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const admins = (await DB.query(
                `SELECT email, phone_number, given_name, family_name
                 FROM Admin
                 WHERE school_id = :school_id
                 ORDER BY id DESC`,
                { school_id: req.user.school_id }
            )) as Array<{
                email: string;
                phone_number: string;
                given_name: string;
                family_name: string;
            }>;

            if (admins.length === 0) {
                return res.status(404).json({ error: 'No admins found' }).end();
            }

            const csvContent = stringify(admins, {
                header: true,
                columns: ['email', 'phone_number', 'given_name', 'family_name'],
            });

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="admins.csv"'
            );
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
        } catch (e: any) {
            return next(e);
        }
    };

    downloadCSVTemplate = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const headers = [
                'email',
                'phone_number',
                'given_name',
                'family_name',
            ];

            const csvContent = stringify([headers], {
                header: false,
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="admin_template.csv"'
            );

            const bom = '\uFEFF';
            res.send(bom + csvContent);
        } catch (e: any) {
            return next(e);
        }
    };

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create admin
     */
    createAdmin = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * POST /list - Get admin list with pagination
     */
    getAdminList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * GET /:id - Get admin detail
     */
    getAdminDetail = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * POST /get-details - Get admin detail (secure POST version)
     */
    getAdminDetailSecure = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    resendTemporaryPassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw new ApiError(401, 'invalid_or_missing_admin_id');
            }

            const result = await this.adminService.resendTemporaryPassword(
                parseInt(adminId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * PUT /:id - Update admin
     */
    updateAdmin = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * DELETE /:id - Delete admin
     */
    deleteAdmin = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };
}

export default AdminModuleController;
