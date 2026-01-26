// Parent Module Controller (Vertical Slice)
// Thin controller: request parse + validate + service call + response

import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router, NextFunction } from 'express';
import {
    isValidArrayId,
    isValidId,
    isValidPhoneNumber,
    isValidEmail,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import { ApiError } from '../../errors/ApiError';
import { createParentService } from './parent.service';
import { syncronizePosts } from '../../utils/messageHelper';
import DB from '../../utils/db-client';
import { stringify } from 'csv-stringify/sync';
import { parseKintoneRow } from '../../utils/helper';
import { Connection } from 'mysql2/promise';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';
import {
    handleCSVUpload,
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    RowError as GenericRowError,
    CSVRowBase,
} from '../../utils/csv-upload';

interface CognitoClient {
    register(
        username: string,
        email: string | null,
        phoneNumber: string
    ): Promise<{ sub_id: string }>;
    delete(phoneNumber: string): Promise<void>;
    resendTemporaryPassword(phoneNumber: string): Promise<{ message: string }>;
}

interface ParentCSVRow extends CSVRowBase {
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_numbers: string[];
}

type ParentRowError = GenericRowError<ParentCSVRow>;

class ParentModuleController implements IController {
    public router: Router = express.Router();
    private parentService: ReturnType<typeof createParentService>;
    public cognitoClient: CognitoClient;

    constructor(cognitoClient: CognitoClient) {
        this.cognitoClient = cognitoClient;
        this.parentService = createParentService(cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        // CSV/Kintone endpoints (must be before /:id routes)
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadParentsFromCSV
        );
        this.router.post(
            '/kintoneUpload',
            verifyToken,
            this.uploadParentsFromKintone
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportParentsToCSV);

        this.router.post('/ids', verifyToken, this.getParentsByIds);
        this.router.post('/list', verifyToken, this.getParentList);
        this.router.post(
            '/list/detailed',
            verifyToken,
            this.getDetailedParentList
        );
        this.router.get('/:id', verifyToken, this.getParentDetail);
        this.router.post(
            '/get-details',
            verifyToken,
            this.getParentDetailSecure
        );
        this.router.post('/create', verifyToken, this.createParent);
        this.router.put('/:id', verifyToken, this.updateParent);
        this.router.delete('/:id', verifyToken, this.deleteParent);
        this.router.post(
            '/:id/resend-password',
            verifyToken,
            this.resendPassword
        );
        this.router.post(
            '/bulk-resend-password',
            verifyToken,
            this.bulkResendPassword
        );
        this.router.get('/:id/students', verifyToken, this.getParentStudents);
        this.router.post(
            '/get-students',
            verifyToken,
            this.getParentStudentsSecure
        );
        this.router.post(
            '/:id/students',
            verifyToken,
            this.changeParentStudents
        );
    }

    /**
     * Get parents by their IDs
     * POST /ids
     * Body: { parentIds: number[] }
     */
    getParentsByIds = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentIds } = req.body;

            // Validate request
            if (!parentIds || !Array.isArray(parentIds)) {
                throw ApiError.badRequest('Parent IDs must be an array');
            }

            if (!isValidArrayId(parentIds)) {
                throw ApiError.badRequest('Invalid parent ID list');
            }

            // Call service layer
            const result = await this.parentService.getParentsByIds({
                parentIds,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get paginated parent list with filters
     * POST /list
     * Body: { page?, email?, phone_number?, name?, showOnlyNonLoggedIn? }
     */
    getParentList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';
            const showOnlyNonLoggedIn = req.body.showOnlyNonLoggedIn || false;

            // Call service layer
            const result = await this.parentService.getParentList({
                schoolId: req.user.school_id,
                page,
                email: email || undefined,
                phone_number: phone_number || undefined,
                name: name || undefined,
                showOnlyNonLoggedIn,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent detail
     * GET /:id
     */
    getParentDetail = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid or missing parent ID');
            }

            // Call service layer
            const result = await this.parentService.getParentDetail({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent detail (secure POST version)
     * POST /get-details
     * Body: { parentId }
     */
    getParentDetailSecure = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentId } = req.body;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid or missing parent ID');
            }

            // Call service layer
            const result = await this.parentService.getParentDetail({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get detailed parent list with arn field
     * POST /list/detailed
     * Body: { page?, email?, phone_number?, name? }
     */
    getDetailedParentList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';

            // Call service layer
            const result = await this.parentService.getDetailedParentList({
                schoolId: req.user.school_id,
                page,
                email: email || undefined,
                phone_number: phone_number || undefined,
                name: name || undefined,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Create a new parent
     * POST /create
     * Body: { email?, phone_number, given_name?, family_name?, students? }
     */
    createParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { email, phone_number, students } = req.body;
            let { given_name, family_name } = req.body as any;

            // Validate phone
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw ApiError.badRequest('invalid_or_missing_phone');
            }

            // Validate names (optional but must be valid if provided)
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw ApiError.badRequest('invalid_or_missing_given_name');
            }
            if (family_name && !isValidString(family_name)) {
                throw ApiError.badRequest('invalid_or_missing_family_name');
            }

            // Validate students array
            if (
                students &&
                (!Array.isArray(students) ||
                    !isValidArrayId(students) ||
                    students.length > 5)
            ) {
                throw ApiError.badRequest('invalid_students_array');
            }

            // Call service
            const result = await this.parentService.createParent({
                email: email || null,
                phone_number,
                given_name: given_name || '',
                family_name: family_name || '',
                students: students || [],
                schoolId: req.user.school_id,
            });

            // Sync posts (external side effect)
            if (result.parent.students.length > 0) {
                for (const student of result.parent.students) {
                    await syncronizePosts(result.parent.id, student.id);
                }
            }

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Update parent
     * PUT /:id
     * Body: { email?, phone_number, given_name?, family_name? }
     */
    updateParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;
            const { phone_number, email } = req.body;
            let { given_name, family_name } = req.body as any;

            // Validate parent ID
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Validate email
            if (email !== null && email && !isValidEmail(email)) {
                throw ApiError.badRequest('invalid_or_missing_email');
            }

            // Validate names
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw ApiError.badRequest('invalid_or_missing_given_name');
            }
            if (family_name && !isValidString(family_name)) {
                throw ApiError.badRequest('invalid_or_missing_family_name');
            }

            // Call service
            const result = await this.parentService.updateParent({
                parentId,
                email: email || null,
                phone_number,
                given_name: given_name || '',
                family_name: family_name || '',
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Delete parent
     * DELETE /:id
     */
    deleteParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.deleteParent({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Resend temporary password
     * POST /:id/resend-password
     */
    resendPassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid parent ID');
            }

            // Call service
            const result = await this.parentService.resendPassword({
                parentId,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Bulk resend temporary passwords
     * POST /bulk-resend-password
     * Body: { parentIds: number[] }
     */
    bulkResendPassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentIds } = req.body;

            // Validate
            if (!Array.isArray(parentIds) || parentIds.length === 0) {
                throw ApiError.badRequest('Invalid parent IDs array');
            }

            for (const id of parentIds) {
                if (!isValidId(id)) {
                    throw ApiError.badRequest(`Invalid parent ID: ${id}`);
                }
            }

            // Call service
            const result = await this.parentService.bulkResendPassword({
                parentIds,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent with students
     * GET /:id/students
     */
    getParentStudents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.getParentStudents({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get students for parent (secure POST version)
     * POST /get-students
     * Body: { parentId }
     */
    getParentStudentsSecure = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentId } = req.body;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.getParentStudentsSecure({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Change parent's students
     * POST /:id/students
     * Body: { students: number[] }
     */
    changeParentStudents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;
            const { students } = req.body;

            // Validate parent ID
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Validate students array
            if (
                !students ||
                !Array.isArray(students) ||
                !isValidArrayId(students)
            ) {
                throw ApiError.badRequest('invalid_or_missing_students');
            }

            // Call service
            const result = await this.parentService.changeParentStudents({
                parentId,
                students,
                schoolId: req.user.school_id,
            });

            // Sync posts for new students (side effect)
            if (result.newStudentIds && result.newStudentIds.length > 0) {
                for (const studentId of result.newStudentIds) {
                    await syncronizePosts(parseInt(parentId), studentId);
                }
            }

            return res.status(200).json({ message: result.message }).end();
        } catch (e: any) {
            next(e);
        }
    };

    // ==================== CSV / Kintone Methods ====================

    uploadParentsFromKintone = async (req: ExtendedRequest, res: Response) => {
        const {
            kintoneSubdomain,
            kintoneDomain,
            kintoneToken,
            given_name_field,
            family_name_field,
            email_field,
            phone_number_field,
            student_number_field,
        } = req.body;
        const kintoneRecords: any[] = [];
        try {
            if (
                !kintoneSubdomain ||
                !kintoneDomain ||
                !kintoneToken ||
                !email_field ||
                !phone_number_field ||
                !student_number_field
            ) {
                throw new Error(
                    'kintoneSubdomain, kintoneDomain, kintoneToken, email_field, phone_number_field, student_number_field are required'
                );
            }

            const allowedDomains: { [key: string]: string } = {
                cybozu: 'cybozu.com',
                kintone: 'kintone.com',
                'cybozu-dev': 'cybozu-dev.com',
            };

            const selectedDomain = allowedDomains[kintoneDomain];
            if (!selectedDomain) {
                console.warn(
                    `SECURITY: Invalid domain selection blocked: ${kintoneDomain}`
                );
                throw {
                    status: 400,
                    message: 'invalid_kintone_domain_provided',
                };
            }

            if (
                !kintoneSubdomain ||
                !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$/i.test(kintoneSubdomain)
            ) {
                console.warn(
                    `SECURITY: Invalid subdomain format blocked: ${kintoneSubdomain}`
                );
                throw {
                    status: 400,
                    message: 'invalid_kintone_subdomain_provided',
                };
            }

            const validatedUrl = `https://${kintoneSubdomain}.${selectedDomain}/k/v1/records.json`;

            if (
                !kintoneToken ||
                typeof kintoneToken !== 'string' ||
                kintoneToken.length < 10 ||
                kintoneToken.length > 100
            ) {
                throw {
                    status: 400,
                    message: 'invalid_kintone_token_provided',
                };
            }

            let data: any;
            const errors: any[] = [];

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(validatedUrl, {
                    method: 'GET',
                    headers: {
                        'X-Cybozu-API-Token': kintoneToken,
                        'User-Agent': 'Appuri-Backend/1.0',
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal,
                    redirect: 'error',
                    referrerPolicy: 'no-referrer',
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const responseData = await response.json();
                    console.error(responseData, response.status);
                    return res
                        .status(500)
                        .json({
                            error: 'error_fetching_data_kintone',
                            message: responseData.message,
                        })
                        .end();
                }

                data = await response.json();
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw {
                        status: 408,
                        message: 'kintone_request_timeout',
                    };
                }
                throw {
                    status: 500,
                    message: 'kintone_network_error',
                };
            }

            for (const record of data.records) {
                let given_name: any = given_name_field
                    ? record[given_name_field]
                    : undefined;
                let family_name: any = family_name_field
                    ? record[family_name_field]
                    : undefined;
                let email: any = record[email_field];
                let phone_number: any = record[phone_number_field];
                let student_number: any = record[student_number_field];

                const rowErrors: any = {};
                if (given_name !== undefined) {
                    given_name = parseKintoneRow(given_name);
                    if (given_name && !isValidString(given_name)) {
                        rowErrors.given_name = 'invalid_given_name_format';
                    }
                }
                if (family_name !== undefined) {
                    family_name = parseKintoneRow(family_name);
                    if (family_name && !isValidString(family_name)) {
                        rowErrors.family_name = 'invalid_family_name_format';
                    }
                }

                if (!email) {
                    rowErrors.email = 'missing_or_empty_email';
                } else {
                    email = parseKintoneRow(email);
                    if (!isValidEmail(email)) {
                        rowErrors.email = 'invalid_email_format';
                    }
                }

                if (!phone_number) {
                    rowErrors.phone_number = 'missing_or_empty_phone_number';
                } else {
                    phone_number = parseKintoneRow(phone_number);
                    if (phone_number.startsWith('+')) {
                        phone_number = phone_number.substring(1);
                    }
                    if (!isValidPhoneNumber(phone_number)) {
                        rowErrors.phone_number = 'invalid_phone_number_format';
                    }
                }

                if (!student_number) {
                    rowErrors.student_number =
                        'student_numbers_missing_or_empty';
                } else {
                    student_number = parseKintoneRow(student_number);
                    if (!isValidStudentNumber(student_number)) {
                        rowErrors.student_number =
                            'invalid_student_numbers_format';
                    }
                }

                const row = {
                    given_name: given_name ?? null,
                    family_name: family_name ?? null,
                    email: email,
                    phone_number: phone_number,
                    student_number: student_number,
                };

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({ row, errors: rowErrors });
                } else {
                    kintoneRecords.push(row);
                }
            }

            if (kintoneRecords.length === 0) {
                errors.push({ row: { email: 'no_records_found' } });
            }

            const existingEmails =
                kintoneRecords?.length > 0
                    ? await DB.query(
                          'SELECT email FROM Parent WHERE email IN (:emails)',
                          {
                              emails: kintoneRecords.map(
                                  (row: any) => row.email
                              ),
                          }
                      )
                    : [];
            const existingPhoneNumbers =
                kintoneRecords?.length > 0
                    ? await DB.query(
                          'SELECT phone_number FROM Parent WHERE phone_number IN (:phoneNumbers)',
                          {
                              phoneNumbers: kintoneRecords.map(
                                  (row: any) => row.phone_number
                              ),
                          }
                      )
                    : [];

            const existingEmailsSet = new Set(
                existingEmails.map((email: any) => email.email)
            );
            const existingPhoneNumbersSet = new Set(
                existingPhoneNumbers.map(
                    (phoneNumber: any) => phoneNumber.phone_number
                )
            );

            const createList: any[] = [];
            const updateList: any[] = [];

            for (const row of kintoneRecords) {
                const { email, phone_number } = row;
                if (existingEmailsSet.has(email)) {
                    updateList.push(row);
                } else if (existingPhoneNumbersSet.has(phone_number)) {
                    updateList.push(row);
                } else {
                    createList.push(row);
                }
            }

            for (const row of createList) {
                const parent = await this.cognitoClient.register(
                    row.phone_number,
                    row.email,
                    row.phone_number
                );
                const parentInsert = await DB.execute(
                    `INSERT INTO
                    Parent (cognito_sub_id, email, phone_number, given_name, family_name, school_id)
                    VALUES (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id)`,
                    {
                        ...row,
                        school_id: req.user.school_id,
                        cognito_sub_id: parent.sub_id,
                        given_name: row.given_name || '',
                        family_name: row.family_name || '',
                    }
                );
                const parentId = parentInsert.insertId;
                const studentRows = await DB.query(
                    `SELECT id
                    FROM Student WHERE student_number IN (:student_number)
                    GROUP BY student_number`,
                    {
                        student_number: row.student_number,
                    }
                );
                const values = studentRows
                    .map((student: any) => `(${student.id}, ${parentId})`)
                    .join(', ');
                await DB.execute(
                    `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
                );

                for (const student of studentRows) {
                    await syncronizePosts(parentId, student.id);
                }
            }
            for (const row of updateList) {
                await DB.execute(
                    'UPDATE Parent SET phone_number = :phone_number, given_name = :given_name, family_name = :family_name WHERE email = :email',
                    {
                        ...row,
                        given_name: row.given_name || '',
                        family_name: row.family_name || '',
                    }
                );
                const parentId = (
                    await DB.query(
                        `SELECT id FROM Parent WHERE email = :email`,
                        { email: row.email }
                    )
                )[0].id;
                const student = await DB.query(
                    `SELECT id
                    FROM Student WHERE student_number = :student_number`,
                    {
                        student_number: row.student_number,
                    }
                );
                const existingStudent = student[0];
                if (!existingStudent) {
                    errors.push({
                        row,
                        errors: { student_number: 'student_not_found' },
                    });
                }
                const existingStudentId = existingStudent.id;
                const studentParent = await DB.query(
                    `SELECT id
                    FROM StudentParent WHERE parent_id = :parent_id AND student_id = :student_id`,
                    {
                        parent_id: parentId,
                        student_id: existingStudentId,
                    }
                );
                if (studentParent.length > 0) {
                    errors.push({
                        row,
                        errors: {
                            student_number:
                                'student_already_attached_to_parent',
                        },
                    });
                }
                if (errors.length > 0) {
                    continue;
                }
                await DB.execute(
                    `DELETE FROM StudentParent WHERE parent_id = :parent_id`,
                    {
                        parent_id: parentId,
                        student_id: existingStudentId,
                    }
                );
                await DB.execute(
                    `INSERT INTO StudentParent (student_id, parent_id) VALUES (:student_id, :parent_id)`,
                    { student_id: existingStudentId, parent_id: parentId }
                );

                await syncronizePosts(parentId, existingStudent.id);
            }

            if (errors.length > 0) {
                return res
                    .status(400)
                    .json({
                        message:
                            'Kintone data uploaded successfully but with errors',
                        errors: errors,
                    })
                    .end();
            }

            return res
                .status(200)
                .json({
                    message: 'Kintone data uploaded successfully',
                })
                .end();
        } catch (e: any) {
            console.error(e);
            return res
                .status(500)
                .json({
                    error: 'Internal server error',
                    details: e.message,
                })
                .end();
        }
    };

    exportParentsToCSV = async (req: ExtendedRequest, res: Response) => {
        try {
            const parents = await DB.query(
                `SELECT
                id, email, phone_number, given_name, family_name
                FROM Parent
                WHERE school_id = :school_id`,
                {
                    school_id: req.user.school_id,
                }
            );

            if (parents.length === 0) {
                return res
                    .status(404)
                    .json({
                        error: 'No parents found',
                    })
                    .end();
            }

            for (const parent of parents as any[]) {
                const studentList = await DB.query(
                    `SELECT
                    st.student_number
                    FROM StudentParent AS sp
                    INNER JOIN Student AS st ON sp.student_id = st.id
                    WHERE sp.parent_id = :parent_id`,
                    {
                        parent_id: parent.id,
                    }
                );
                parent.student_numbers = studentList.map(
                    (student: any) => student.student_number
                );
            }

            const csvData: any = [];
            for (const parent of parents as any[]) {
                const student_numbers = parent.student_numbers;
                const first = student_numbers.splice(0, 1);
                csvData.push({
                    email: parent.email,
                    phone_number: parent.phone_number,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    student_numbers: first[0],
                });
                for (const student_number of student_numbers) {
                    csvData.push({
                        student_numbers: student_number,
                    });
                }
            }

            const csvContent = stringify(csvData, {
                header: true,
                columns: [
                    'email',
                    'phone_number',
                    'given_name',
                    'family_name',
                    'student_numbers',
                ],
            });

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="parents.csv"'
            );
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
        } catch (e: any) {
            return res
                .status(500)
                .json({
                    error: 'Internal server error',
                    details: e.message,
                })
                .end();
        }
    };

    uploadParentsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, action, withCSV } = req.body;
        const throwErrors = throwInError === 'true';
        const withCSVBool = withCSV === 'true';

        if (!req.file || !req.file.buffer) {
            return res
                .status(400)
                .json(createErrorResponse(ErrorKeys.file_missing))
                .end();
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

        const response = createBaseResponse<ParentCSVRow>();
        let connection: Connection | null = null;
        let createdCognitoUsers: string[] = [];
        try {
            const rawRows = await parseCSVBuffer(req.file.buffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return res.status(200).json(response).end();
            }

            const seenEmails = new Set<string>();
            const seenPhones = new Set<string>();
            const valid: ParentCSVRow[] = [];
            const errors: ParentRowError[] = [];

            for (const row of rawRows) {
                const rawEmail = String(row.email || '').trim();
                const normalized: ParentCSVRow = {
                    email: rawEmail === '' ? null : rawEmail,
                    phone_number: String(row.phone_number || '').trim(),
                    given_name: String(row.given_name || '').trim(),
                    family_name: String(row.family_name || '').trim(),
                    student_numbers: String(row.student_numbers || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                };
                const rowErrors: Record<string, string> = {};
                if (normalized.email && !isValidEmail(normalized.email))
                    rowErrors.email = ErrorKeys.invalid_email;
                if (!isValidPhoneNumber(normalized.phone_number))
                    rowErrors.phone_number = ErrorKeys.invalid_phone_number;
                if (
                    normalized.given_name &&
                    !isValidString(normalized.given_name)
                )
                    rowErrors.given_name = ErrorKeys.invalid_name;
                if (
                    normalized.family_name &&
                    !isValidString(normalized.family_name)
                )
                    rowErrors.family_name = ErrorKeys.invalid_name;
                for (const sn of normalized.student_numbers) {
                    if (!isValidStudentNumber(sn)) {
                        rowErrors.student_numbers =
                            ErrorKeys.invalid_student_number;
                        break;
                    }
                }
                if (normalized.email && seenEmails.has(normalized.email))
                    rowErrors.email = ErrorKeys.email_already_exists;
                if (seenPhones.has(normalized.phone_number))
                    rowErrors.phone_number = ErrorKeys.phone_already_exists;

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({ row: normalized, errors: rowErrors });
                } else {
                    if (normalized.email) seenEmails.add(normalized.email);
                    seenPhones.add(normalized.phone_number);
                    valid.push(normalized);
                }
            }

            if (errors.length && throwErrors) {
                response.errors = errors;
                response.summary.errors = errors.length;
                return res.status(400).json(response).end();
            }

            connection = await DB.beginTransaction();

            const emails = valid
                .map(v => v.email)
                .filter((e): e is string => Boolean(e));
            const phones = valid.map(v => v.phone_number).filter(Boolean);
            let existing: any[] = [];
            if (emails.length || phones.length) {
                const parts: string[] = [];
                if (emails.length) parts.push('email IN (:emails)');
                if (phones.length) parts.push('phone_number IN (:phones)');
                const where = `(${parts.join(' OR ')}) AND school_id = :sid`;
                existing = await DB.queryWithConnection(
                    connection,
                    `SELECT id, email, phone_number FROM Parent WHERE ${where}`,
                    { emails, phones, sid: req.user.school_id }
                );
            }
            const emailToId = new Map(
                existing
                    .filter((p: any) => p.email !== null && p.email !== '')
                    .map((p: any) => [p.email, p.id])
            );
            const phoneToId = new Map(
                existing.map((p: any) => [p.phone_number, p.id])
            );

            for (const row of valid) {
                try {
                    if (action === 'create') {
                        if (row.email && emailToId.has(row.email)) {
                            response.errors.push({
                                row,
                                errors: {
                                    email: ErrorKeys.email_already_exists,
                                },
                            });
                            continue;
                        }
                        if (phoneToId.has(row.phone_number)) {
                            response.errors.push({
                                row,
                                errors: {
                                    phone_number:
                                        ErrorKeys.phone_already_exists,
                                },
                            });
                            continue;
                        }
                        const phone_number = row.phone_number.startsWith('+')
                            ? row.phone_number
                            : `+${row.phone_number}`;
                        const parent = await this.cognitoClient.register(
                            phone_number,
                            row.email || '',
                            phone_number
                        );
                        if (parent && parent.sub_id) {
                            createdCognitoUsers.push(parent.sub_id);
                        }
                        const insert = await DB.executeWithConnection(
                            connection,
                            `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
                             VALUES (:cid, :email, :phone, :given, :family, :sid)`,
                            {
                                cid: parent.sub_id,
                                email: row.email,
                                phone: row.phone_number,
                                given: row.given_name || '',
                                family: row.family_name || '',
                                sid: req.user.school_id,
                            }
                        );
                        const parentId = insert.insertId;
                        if (row.student_numbers.length) {
                            const studs = await DB.queryWithConnection(
                                connection,
                                'SELECT id, student_number FROM Student WHERE student_number IN (:sns)',
                                { sns: row.student_numbers }
                            );
                            if (studs.length) {
                                const values = studs
                                    .map((s: any) => `(${s.id}, ${parentId})`)
                                    .join(',');
                                await DB.executeWithConnection(
                                    connection,
                                    `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
                                );
                                for (const s of studs) {
                                    await syncronizePosts(parentId, s.id);
                                }
                            }
                        }
                        response.inserted.push(row);
                    } else if (action === 'update') {
                        const pid = row.email
                            ? emailToId.get(row.email)
                            : phoneToId.get(row.phone_number);
                        if (!pid) {
                            response.errors.push({
                                row,
                                errors: {
                                    email: ErrorKeys.parent_does_not_exist,
                                },
                            });
                            continue;
                        }
                        await DB.executeWithConnection(
                            connection,
                            `UPDATE Parent SET phone_number = :phone, given_name = :given, family_name = :family WHERE id = :id`,
                            {
                                phone: row.phone_number,
                                given: row.given_name || '',
                                family: row.family_name || '',
                                id: pid,
                            }
                        );
                        const existingStuds = await DB.queryWithConnection(
                            connection,
                            'SELECT st.id, st.student_number FROM StudentParent sp INNER JOIN Student st ON sp.student_id = st.id WHERE sp.parent_id = :pid',
                            { pid }
                        );
                        const existingNums = new Set(
                            existingStuds.map((s: any) => s.student_number)
                        );
                        const newTargets = row.student_numbers.filter(
                            s => !existingNums.has(s)
                        );
                        const toRemove = existingStuds.filter(
                            (s: any) =>
                                !row.student_numbers.includes(s.student_number)
                        );
                        if (toRemove.length) {
                            await DB.executeWithConnection(
                                connection,
                                `DELETE FROM StudentParent WHERE parent_id = :pid AND student_id IN (:ids)`,
                                {
                                    pid,
                                    ids: toRemove.map((s: any) => s.id),
                                }
                            );
                        }
                        if (newTargets.length) {
                            const studs = await DB.queryWithConnection(
                                connection,
                                'SELECT id, student_number FROM Student WHERE student_number IN (:sns)',
                                { sns: newTargets }
                            );
                            if (studs.length) {
                                const values = studs
                                    .map((s: any) => `(${s.id}, ${pid})`)
                                    .join(',');
                                await DB.executeWithConnection(
                                    connection,
                                    `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
                                );
                                for (const s of studs) {
                                    await syncronizePosts(
                                        pid as number,
                                        s.id as number
                                    );
                                }
                            }
                        }
                        response.updated.push(row);
                    } else if (action === 'delete') {
                        const pid = row.email
                            ? emailToId.get(row.email)
                            : phoneToId.get(row.phone_number);
                        if (!pid) {
                            response.errors.push({
                                row,
                                errors: {
                                    email: ErrorKeys.parent_does_not_exist,
                                },
                            });
                            continue;
                        }
                        await this.cognitoClient.delete(`+${row.phone_number}`);
                        await DB.executeWithConnection(
                            connection,
                            'DELETE FROM Parent WHERE id = :id AND school_id = :sid',
                            { id: pid, sid: req.user.school_id }
                        );
                        response.deleted.push(row);
                    }
                } catch (_) {
                    void _;
                    try {
                        if (createdCognitoUsers.length) {
                            const last = createdCognitoUsers.pop();
                            if (last) await this.cognitoClient.delete(last);
                        }
                    } catch (cleanupErr) {
                        console.error(
                            'Failed to cleanup cognito user after row error',
                            cleanupErr
                        );
                    }

                    response.errors.push({
                        row,
                        errors: { general: 'processing_error' },
                    });
                }
            }

            bumpSummary(response, 'inserted');
            bumpSummary(response, 'updated');
            bumpSummary(response, 'deleted');
            response.summary.errors = response.errors.length;
            finalizeResponse(response, withCSVBool);

            await DB.commitTransaction(connection);

            return res
                .status(response.errors.length ? 400 : 200)
                .json(response)
                .end();
        } catch (e: any) {
            if (connection) await DB.rollbackTransaction(connection);
            try {
                if (createdCognitoUsers && createdCognitoUsers.length) {
                    for (const username of createdCognitoUsers) {
                        try {
                            await this.cognitoClient.delete(username);
                        } catch (e) {
                            console.error(
                                'Failed to cleanup cognito user during rollback:',
                                username,
                                e
                            );
                        }
                    }
                }
            } catch (e) {
                console.error('Error during cognito cleanup after rollback', e);
            }
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    downloadCSVTemplate = async (req: ExtendedRequest, res: Response) => {
        try {
            const headers = [
                'email',
                'phone_number',
                'given_name',
                'family_name',
                'student_numbers',
            ];

            const csvContent = stringify([headers], {
                header: false,
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="parent_template.csv"'
            );

            const bom = '\uFEFF';
            res.send(bom + csvContent);
        } catch (e: any) {
            console.error('Error generating CSV template:', e);
            return res.status(500).json({ error: 'internal_server_error' });
        }
    };
}

export default ParentModuleController;
