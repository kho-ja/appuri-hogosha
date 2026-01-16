import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';
import { Admin } from '../../utils/cognito-client';
import DB from '../../utils/db-client';
import {
    isValidEmail,
    isValidId,
    isValidPhoneNumber,
    isValidString,
} from '../../utils/validate';
import process from 'node:process';
import { generatePaginationLinks } from '../../utils/helper';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
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
import AdminModuleController from '../../modules/admin/admin.controller';

// CSV Upload now handled by shared middleware (handleCSVUpload)
class AdminController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    private adminModule: AdminModuleController;

    constructor() {
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;
        this.adminModule = new AdminModuleController(this.cognitoClient);
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

        // Cognito-specific operation
        this.router.post(
            '/:id/resend-password',
            verifyToken,
            this.resendTemporaryPassword
        );

        // Wire admin module routes (CRUD operations)
        this.router.use('/', this.adminModule.router);
    }

    resendTemporaryPassword = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!isValidId(adminId)) {
                return res
                    .status(400)
                    .json({
                        error: 'Invalid admin ID',
                    })
                    .end();
            }

            // Get admin from database to get their email
            const admins = await DB.query(
                `
                SELECT
                    ad.email,
                    ad.phone_number,
                    ad.given_name,
                    ad.family_name
                FROM Admin ad
                WHERE ad.id = :adminId
            `,
                {
                    adminId: adminId,
                }
            );

            if (admins.length === 0) {
                return res
                    .status(404)
                    .json({
                        error: 'Admin not found',
                    })
                    .end();
            }

            const admin = admins[0];

            // Use Cognito client to resend temporary password
            const result = await this.cognitoClient.resendTemporaryPassword(
                admin.email
            );

            return res
                .status(200)
                .json({
                    message: result.message,
                    admin_name: `${admin.given_name} ${admin.family_name}`,
                    email: admin.email,
                })
                .end();
        } catch (e: any) {
            console.error('Error resending temporary password:', e);

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

    uploadAdminsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, action, withCSV } = req.body;
        const throwInErrorBool = throwInError === 'true';
        const withCSVBool = withCSV === 'true';

        if (!req.file || !req.file.buffer) {
            return res
                .status(400)
                .json(createErrorResponse(ErrorKeys.file_missing))
                .end();
        }

        // Base response container
        const response = createBaseResponse<any>();
        try {
            // Parse CSV
            const rawRows = await parseCSVBuffer(req.file.buffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return res.status(200).json(response).end();
            }

            // Validate & normalize
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
                // merge validation errors so client can see which rows skipped
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

            // Query existing
            const existingAdmins = await DB.query(
                'SELECT email FROM Admin WHERE email IN (:emails)',
                { emails: valid.map(r => r.email) }
            );
            const existingEmailSet = new Set(
                existingAdmins.map((a: any) => a.email)
            );

            // Perform action
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

            // Update summary counts
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
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    exportAdminsToCSV = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT
                id, cognito_sub_id, email,
                phone_number, given_name,
                family_name, created_at, last_login_at
                FROM Admin
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            await this.cognitoClient.delete(admin.email);

            await DB.execute('DELETE FROM Admin WHERE id = :id;', {
                id: admin.id,
            });

            return res
                .status(200)
                .json({
                    message: 'adminDeleted',
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { phone_number, given_name, family_name } = req.body;

            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_phone',
                };
            }
            if (!given_name || !isValidString(given_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_given_name',
                };
            }
            if (!family_name || !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email, phone_number,
                       given_name, family_name,
                       created_at
                FROM Admin
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            const findDuplicates = await DB.query(
                'SELECT id, phone_number FROM Admin WHERE phone_number = :phone_number',
                {
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];
                if (duplicate.id != adminId) {
                    if (phone_number == duplicate.phone_number) {
                        throw {
                            status: 401,
                            message: 'phone_number_already_exists',
                        };
                    }
                }
            }

            await DB.execute(
                `UPDATE Admin SET
                        phone_number = :phone_number,
                        family_name = :family_name,
                        given_name = :given_name
                    WHERE id = :id`,
                {
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    id: admin.id,
                }
            );

            return res
                .status(200)
                .json({
                    admin: {
                        id: admin.id,
                        email: admin.email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminView = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email,
                       phone_number,
                       given_name,
                       family_name,
                       created_at
                FROM Admin
                WHERE id = :id
                AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            return res
                .status(200)
                .json({
                    admin: admin,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    // Secure POST version of adminView for sensitive data
    adminViewSecure = async (req: ExtendedRequest, res: Response) => {
        try {
            // Get ID from request body instead of URL parameters for better security
            const { adminId } = req.body;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email,
                       phone_number,
                       given_name,
                       family_name,
                       created_at
                FROM Admin
                WHERE id = :id
                AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            return res
                .status(200)
                .json({
                    admin: admin,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
            };

            if (email) {
                filters.push('email LIKE :email');
                params.email = `%${email}%`;
            }
            if (phone_number) {
                filters.push('phone_number LIKE :phone_number');
                params.phone_number = `%${phone_number}%`;
            }
            if (name) {
                filters.push(
                    '(given_name LIKE :name OR family_name LIKE :name)'
                );
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const adminList = await DB.query(
                `SELECT
                id, email, phone_number, given_name, family_name
                FROM Admin
                WHERE school_id = :school_id ${whereClause}
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset;`,
                params
            );

            const totalAdmins = (
                await DB.query(
                    `SELECT COUNT(*) as total
                FROM Admin WHERE school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalAdmins / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_admins: totalAdmins,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            return res
                .status(200)
                .json({
                    admins: adminList,
                    pagination: pagination,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    createAdmin = async (req: ExtendedRequest, res: Response) => {
        try {
            const { email, phone_number, given_name, family_name } = req.body;

            if (!email || !isValidEmail(email)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_email',
                };
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_phone',
                };
            }
            if (!given_name || !isValidString(given_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_given_name',
                };
            }
            if (!family_name || !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const findDuplicates = await DB.query(
                'SELECT phone_number,email FROM Admin WHERE phone_number = :phone_number OR email = :email;',
                {
                    email: email,
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];

                if (
                    email == duplicate.email &&
                    phone_number == duplicate.phone_number
                ) {
                    throw {
                        status: 401,
                        message: 'email_and_phone_number_already_exist',
                    };
                }
                if (phone_number == duplicate.phone_number) {
                    throw {
                        status: 401,
                        message: 'phone_number_already_exists',
                    };
                } else {
                    throw {
                        status: 401,
                        message: 'email_already_exists',
                    };
                }
            }

            const admin = await this.cognitoClient.register(email, email);

            const adminInsert = await DB.execute(
                `INSERT INTO Admin
                (cognito_sub_id, email, phone_number, given_name, family_name
                    , created_at, last_login_at, permissions, school_id) VALUES
                    (:cognito_sub_id, :email, :phone_number, :given_name, :family_name
                    , NOW(), NOW(), '{}', :school_id) `,
                {
                    cognito_sub_id: admin.sub_id,
                    email: email,
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    admin: {
                        id: adminInsert.insertId,
                        email: email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    downloadCSVTemplate = async (req: ExtendedRequest, res: Response) => {
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
            console.error('Error generating CSV template:', e);
            return res.status(500).json({ error: 'internal_server_error' });
        }
    };

    // ==================== Legacy Methods (migrated to module) ====================
    // CRUD operations migrated to admin module:
    // - POST /create -> createAdmin
    // - POST /list -> adminList
    // - GET /:id -> adminView
    // - POST /get-details -> adminViewSecure
    // - PUT /:id -> adminEdit
    // - DELETE /:id -> adminDelete

    /*
    adminDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT
                id, cognito_sub_id, email,
                phone_number, given_name,
                family_name, created_at, last_login_at
                FROM Admin
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            await this.cognitoClient.delete(admin.email);

            await DB.execute('DELETE FROM Admin WHERE id = :id;', {
                id: admin.id,
            });

            return res
                .status(200)
                .json({
                    message: 'adminDeleted',
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { phone_number, given_name, family_name } = req.body;

            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_phone',
                };
            }
            if (!given_name || !isValidString(given_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_given_name',
                };
            }
            if (!family_name || !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email, phone_number,
                       given_name, family_name,
                       created_at
                FROM Admin
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            const findDuplicates = await DB.query(
                'SELECT id, phone_number FROM Admin WHERE phone_number = :phone_number',
                {
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];
                if (duplicate.id != adminId) {
                    if (phone_number == duplicate.phone_number) {
                        throw {
                            status: 401,
                            message: 'phone_number_already_exists',
                        };
                    }
                }
            }

            await DB.execute(
                `UPDATE Admin SET
                        phone_number = :phone_number,
                        family_name = :family_name,
                        given_name = :given_name
                    WHERE id = :id`,
                {
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    id: admin.id,
                }
            );

            return res
                .status(200)
                .json({
                    admin: {
                        id: admin.id,
                        email: admin.email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminView = async (req: ExtendedRequest, res: Response) => {
        try {
            const adminId = req.params.id;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email,
                       phone_number,
                       given_name,
                       family_name,
                       created_at
                FROM Admin
                WHERE id = :id
                AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            return res
                .status(200)
                .json({
                    admin: admin,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    // Secure POST version of adminView for sensitive data
    adminViewSecure = async (req: ExtendedRequest, res: Response) => {
        try {
            // Get ID from request body instead of URL parameters for better security
            const { adminId } = req.body;

            if (!adminId || !isValidId(adminId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_admin_id',
                };
            }
            const adminInfo = await DB.query(
                `SELECT id,
                       email,
                       phone_number,
                       given_name,
                       family_name,
                       created_at
                FROM Admin
                WHERE id = :id
                AND school_id = :school_id`,
                {
                    id: adminId,
                    school_id: req.user.school_id,
                }
            );

            if (adminInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'admin_not_found',
                };
            }

            const admin = adminInfo[0];

            return res
                .status(200)
                .json({
                    admin: admin,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    adminList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
            };

            if (email) {
                filters.push('email LIKE :email');
                params.email = `%${email}%`;
            }
            if (phone_number) {
                filters.push('phone_number LIKE :phone_number');
                params.phone_number = `%${phone_number}%`;
            }
            if (name) {
                filters.push(
                    '(given_name LIKE :name OR family_name LIKE :name)'
                );
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const adminList = await DB.query(
                `SELECT
                id, email, phone_number, given_name, family_name
                FROM Admin
                WHERE school_id = :school_id ${whereClause}
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset;`,
                params
            );

            const totalAdmins = (
                await DB.query(
                    `SELECT COUNT(*) as total
                FROM Admin WHERE school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalAdmins / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_admins: totalAdmins,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            return res
                .status(200)
                .json({
                    admins: adminList,
                    pagination: pagination,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    createAdmin = async (req: ExtendedRequest, res: Response) => {
        try {
            const { email, phone_number, given_name, family_name } = req.body;

            if (!email || !isValidEmail(email)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_email',
                };
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_phone',
                };
            }
            if (!given_name || !isValidString(given_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_given_name',
                };
            }
            if (!family_name || !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const findDuplicates = await DB.query(
                'SELECT phone_number,email FROM Admin WHERE phone_number = :phone_number OR email = :email;',
                {
                    email: email,
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];

                if (
                    email == duplicate.email &&
                    phone_number == duplicate.phone_number
                ) {
                    throw {
                        status: 401,
                        message: 'email_and_phone_number_already_exist',
                    };
                }
                if (phone_number == duplicate.phone_number) {
                    throw {
                        status: 401,
                        message: 'phone_number_already_exists',
                    };
                } else {
                    throw {
                        status: 401,
                        message: 'email_already_exists',
                    };
                }
            }

            const admin = await this.cognitoClient.register(email, email);

            const adminInsert = await DB.execute(
                `INSERT INTO Admin
                (cognito_sub_id, email, phone_number, given_name, family_name
                    , created_at, last_login_at, permissions, school_id) VALUES
                    (:cognito_sub_id, :email, :phone_number, :given_name, :family_name
                    , NOW(), NOW(), '{}', :school_id) `,
                {
                    cognito_sub_id: admin.sub_id,
                    email: email,
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    admin: {
                        id: adminInsert.insertId,
                        email: email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
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
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };
    */
}

export default AdminController;
