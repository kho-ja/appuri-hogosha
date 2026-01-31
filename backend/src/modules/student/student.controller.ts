/**
 * Student Controller
 *
 * HTTP layer for Student operations
 * Thin controller - delegates to service layer
 */

import { NextFunction, Router, Response } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { studentService } from './student.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidId,
    isValidArrayId,
    isValidEmail,
    isValidPhoneNumber,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import { syncronizePosts } from '../../utils/messageHelper';
import DB from '../../utils/db-client';
import { stringify } from 'csv-stringify/sync';
import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    handleCSVUpload,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';
import { parseKintoneRow } from '../../utils/helper';

export class StudentModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // CSV/Kintone operations (must be before /:id routes)
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadStudentsFromCSV
        );
        this.router.post('/kintoneUpload', verifyToken, this.kintoneUpload);
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportStudentsToCSV);

        // List/View endpoints
        this.router.post('/ids', verifyToken, this.getStudentsByIds);
        this.router.post('/list', verifyToken, this.getStudentList);
        this.router.get('/:id', verifyToken, this.getStudentDetail);

        // CRUD endpoints
        this.router.post('/create', verifyToken, this.createStudent);
        this.router.put('/:id', verifyToken, this.updateStudent);
        this.router.delete('/:id', verifyToken, this.deleteStudent);

        // Relationship endpoints
        this.router.get('/:id/parents', verifyToken, this.getStudentParents);
        this.router.post(
            '/:id/parents',
            verifyToken,
            this.changeStudentParents
        );
    }

    kintoneUpload = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        const {
            kintoneSubdomain,
            kintoneDomain,
            kintoneToken,
            given_name_field,
            family_name_field,
            email_field,
            phone_number_field,
            student_number_field,
            cohort_field,
        } = req.body;
        const kintoneRecords: any[] = [];
        const errors: any[] = [];

        try {
            if (
                !kintoneSubdomain ||
                !kintoneDomain ||
                !kintoneToken ||
                !given_name_field ||
                !family_name_field ||
                !email_field ||
                !phone_number_field ||
                !student_number_field
            ) {
                throw new Error(
                    'kintoneSubdomain, kintoneDomain, kintoneToken, given_name_field, family_name_field, email_field, phone_number_field, student_number_field are required'
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
                    const data = await response.json();
                    console.error(data, response.status);
                    return res
                        .status(500)
                        .json({
                            error: 'error_fetching_data_kintone',
                            message: data.message,
                        })
                        .end();
                }

                const data = await response.json();

                for (const record of data.records) {
                    let given_name: any = record[given_name_field];
                    let family_name: any = record[family_name_field];
                    let email: any = record[email_field];
                    let phone_number: any = record[phone_number_field];
                    let student_number: any = record[student_number_field];
                    let cohort: any = cohort_field
                        ? record[cohort_field]
                        : undefined;

                    const rowErrors: any = {};

                    if (!given_name) {
                        rowErrors.given_name = 'missing_or_empty_given_name';
                    } else {
                        given_name = parseKintoneRow(given_name);
                        if (!isValidString(given_name)) {
                            rowErrors.given_name = 'invalid_given_name_format';
                        }
                    }

                    if (!family_name) {
                        rowErrors.family_name = 'missing_or_empty_family_name';
                    } else {
                        family_name = parseKintoneRow(family_name);
                        if (!isValidString(family_name)) {
                            rowErrors.family_name =
                                'invalid_family_name_format';
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
                        rowErrors.phone_number = 'missing_or_empty_phone';
                    } else {
                        phone_number = parseKintoneRow(phone_number);
                        if (!isValidPhoneNumber(phone_number)) {
                            rowErrors.phone_number = 'invalid_phone_format';
                        }
                    }

                    if (!student_number) {
                        rowErrors.student_number =
                            'missing_or_empty_student_number';
                    } else {
                        student_number = parseKintoneRow(student_number);
                        if (!isValidStudentNumber(student_number)) {
                            rowErrors.student_number =
                                'invalid_student_number_format';
                        }
                    }

                    if (cohort_field) {
                        cohort = parseKintoneRow(cohort);
                        if (cohort !== undefined && cohort !== null) {
                            const cohortNum = Number(cohort);
                            if (
                                isNaN(cohortNum) ||
                                !Number.isInteger(cohortNum)
                            ) {
                                rowErrors.cohort =
                                    ErrorKeys.invalid_cohort_format;
                            } else if (cohortNum < 0) {
                                rowErrors.cohort =
                                    ErrorKeys.cohort_must_be_positive;
                            }
                        }
                    }

                    if (Object.keys(rowErrors).length > 0) {
                        errors.push({
                            record,
                            errors: rowErrors,
                        });
                    } else {
                        kintoneRecords.push({
                            given_name,
                            family_name,
                            email,
                            phone_number,
                            student_number,
                            cohort: cohort_field ? Number(cohort) : null,
                        });
                    }
                }

                for (const student of kintoneRecords) {
                    try {
                        const duplicates = await DB.query(
                            `SELECT id FROM Student
                             WHERE school_id = :school_id
                             AND (email = :email OR student_number = :student_number OR phone_number = :phone_number)`,
                            {
                                school_id: req.user.school_id,
                                email: student.email,
                                student_number: student.student_number,
                                phone_number: student.phone_number,
                            }
                        );

                        if (duplicates.length > 0) {
                            errors.push({
                                record: student,
                                errors: {
                                    duplicate:
                                        'student_already_exists_email_or_student_number_or_phone',
                                },
                            });
                            continue;
                        }

                        await DB.execute(
                            `INSERT INTO Student(given_name, family_name, email, phone_number, student_number, cohort, school_id)
                             VALUE (:given_name, :family_name, :email, :phone_number, :student_number, :cohort, :school_id);`,
                            {
                                ...student,
                                school_id: req.user.school_id,
                            }
                        );
                    } catch (e: any) {
                        console.error(e);
                        errors.push({
                            record: student,
                            errors: { insert: 'error_creating_student' },
                        });
                    }
                }

                if (errors.length > 0) {
                    return res
                        .status(200)
                        .json({
                            message:
                                'Kintone data uploaded successfully but with errors',
                            errors,
                        })
                        .end();
                }

                return res
                    .status(200)
                    .json({ message: 'kintone_data_uploaded_successfully' })
                    .end();
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    exportStudentsToCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const students = await DB.query(
                `SELECT
                email, phone_number, given_name, family_name, student_number, cohort
                FROM Student
                WHERE school_id = :school_id`,
                {
                    school_id: req.user.school_id,
                }
            );

            if (students.length === 0) {
                return res
                    .status(404)
                    .json({ error: 'No students found' })
                    .end();
            }

            const csvData = students.map((student: any) => ({
                email: student.email,
                phone_number: student.phone_number,
                given_name: student.given_name,
                family_name: student.family_name,
                student_number: student.student_number,
                cohort: student.cohort,
            }));

            const csvContent = stringify(csvData, {
                header: true,
                columns: [
                    'email',
                    'phone_number',
                    'given_name',
                    'family_name',
                    'student_number',
                    'cohort',
                ],
            });

            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header(
                'Content-Disposition',
                'attachment; filename=students.csv'
            );
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8')).end();
        } catch (e: any) {
            return next(e);
        }
    };

    uploadStudentsFromCSV = async (
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
            const rows = await parseCSVBuffer(req.file.buffer);
            if (rows.length === 0) {
                response.message = ErrorKeys.csv_is_empty_but_valid;
                return res.status(200).json(response).end();
            }

            const valid: any[] = [];
            const errors: any[] = [];
            const seenEmails = new Set<string>();
            const seenNumbers = new Set<string>();

            for (const raw of rows) {
                const cohortRaw = String(raw.cohort ?? '').trim();
                let cohort: number | null = null;

                if (cohortRaw !== '') {
                    const cohortNum = Number(cohortRaw);
                    if (isNaN(cohortNum) || !Number.isInteger(cohortNum)) {
                        cohort = null;
                    } else {
                        cohort = cohortNum;
                    }
                }

                const normalized = {
                    email: String(raw.email || '').trim(),
                    phone_number: String(raw.phone_number || '').trim(),
                    given_name: String(raw.given_name || '').trim(),
                    family_name: String(raw.family_name || '').trim(),
                    student_number: String(raw.student_number || '').trim(),
                    cohort,
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
                if (!isValidStudentNumber(normalized.student_number))
                    rowErrors.student_number = ErrorKeys.invalid_student_number;

                if (cohortRaw !== '') {
                    const cohortNum = Number(cohortRaw);
                    if (isNaN(cohortNum) || !Number.isInteger(cohortNum)) {
                        rowErrors.cohort = ErrorKeys.invalid_cohort_format;
                    } else if (cohortNum < 0) {
                        rowErrors.cohort = ErrorKeys.cohort_must_be_positive;
                    }
                }
                if (seenEmails.has(normalized.email))
                    rowErrors.email = ErrorKeys.email_already_exists;
                if (seenNumbers.has(normalized.student_number))
                    rowErrors.student_number =
                        ErrorKeys.student_number_already_exists;

                if (Object.keys(rowErrors).length) {
                    errors.push({ row: normalized, errors: rowErrors });
                } else {
                    seenEmails.add(normalized.email);
                    seenNumbers.add(normalized.student_number);
                    valid.push(normalized);
                }
            }

            if (errors.length) {
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

            if (valid.length === 0) {
                response.summary.errors = response.errors.length;
                finalizeResponse(response, withCSVBool);
                return res.status(400).json(response).end();
            }

            const existingStudents = await DB.query(
                'SELECT email, student_number, phone_number FROM Student WHERE school_id = :school_id AND (email IN (:emails) OR student_number IN (:sns) OR phone_number IN (:phones))',
                {
                    emails: valid.map(v => v.email),
                    sns: valid.map(v => v.student_number),
                    phones: valid.map(v => v.phone_number),
                    school_id: req.user.school_id,
                }
            );
            const existingEmailSet = new Set(
                existingStudents.map((s: any) => s.email)
            );
            const existingNumberSet = new Set(
                existingStudents.map((s: any) => s.student_number)
            );
            const existingPhoneSet = new Set(
                existingStudents.map((s: any) => s.phone_number)
            );

            for (const row of valid) {
                if (action === 'create') {
                    const rowErrors: Record<string, string> = {};
                    if (existingEmailSet.has(row.email)) {
                        rowErrors.email =
                            ErrorKeys.student_email_already_exists;
                    }
                    if (existingNumberSet.has(row.student_number)) {
                        rowErrors.student_number =
                            ErrorKeys.student_number_already_exists;
                    }
                    if (existingPhoneSet.has(row.phone_number)) {
                        rowErrors.phone_number = ErrorKeys.phone_already_exists;
                    }
                    if (Object.keys(rowErrors).length > 0) {
                        response.errors.push({ row, errors: rowErrors });
                        continue;
                    }
                    await DB.execute(
                        `INSERT INTO Student(email, phone_number, given_name, family_name, student_number, cohort, school_id)
                         VALUE (:email, :phone_number, :given_name, :family_name, :student_number, :cohort, :school_id);`,
                        { ...row, school_id: req.user.school_id }
                    );
                    response.inserted.push(row);
                } else if (action === 'update') {
                    if (!existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: { email: ErrorKeys.student_does_not_exist },
                        });
                        continue;
                    }
                    await DB.execute(
                        `UPDATE Student SET
                            phone_number = :phone_number,
                            given_name = :given_name,
                            family_name = :family_name,
                            student_number = :student_number,
                            cohort = :cohort
                         WHERE email = :email AND school_id = :school_id`,
                        { ...row, school_id: req.user.school_id }
                    );
                    response.updated.push(row);
                } else if (action === 'delete') {
                    if (!existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: { email: ErrorKeys.student_does_not_exist },
                        });
                        continue;
                    }
                    await DB.execute(
                        'DELETE FROM Student WHERE email = :email AND school_id = :school_id',
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
                'student_number',
                'cohort',
            ];

            const csvContent = stringify([headers], {
                header: false,
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="student_template.csv"'
            );

            const bom = '\uFEFF';
            res.send(bom + csvContent);
        } catch (e: any) {
            return next(e);
        }
    };

    // ==================== List/View Endpoints ====================

    /**
     * POST /ids - Get students by ID array
     */
    getStudentsByIds = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { studentIds } = req.body;

            if (
                !studentIds ||
                !Array.isArray(studentIds) ||
                !isValidArrayId(studentIds)
            ) {
                throw new ApiError(400, 'invalid_id_list');
            }

            const result = await studentService.getStudentsByIds(
                studentIds,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * POST /list - Get student list with filters
     */
    getStudentList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const filterBy = (req.body.filterBy as string) || 'all';
            const filterValue = (req.body.filterValue as string) || '';

            // Whitelist validation
            const allowedFilterColumns = [
                'all',
                'student_number',
                'cohort',
                'email',
                'phone_number',
                'given_name',
                'family_name',
            ];

            if (!allowedFilterColumns.includes(filterBy)) {
                throw new ApiError(400, 'invalid_filter_column');
            }

            const result = await studentService.getStudentList(
                {
                    page,
                    filterBy: filterBy as any,
                    filterValue,
                },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * GET /:id - Get student detail
     */
    getStudentDetail = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.getStudentDetail(
                parseInt(studentId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create student
     */
    createStudent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const {
                email,
                phone_number,
                given_name,
                family_name,
                student_number: studentNumber,
                cohort,
                parents,
            } = req.body;

            // Normalize student_number
            const student_number = String(studentNumber ?? '').replace(
                /\D+/g,
                ''
            );

            // Validate required fields
            if (!email || !isValidEmail(email)) {
                throw new ApiError(400, 'invalid_or_missing_email');
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(400, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(400, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(400, 'invalid_or_missing_family_name');
            }
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw new ApiError(400, 'invalid_or_missing_student_number');
            }

            // Validate parents array
            if (
                parents &&
                (!Array.isArray(parents) || !isValidArrayId(parents))
            ) {
                throw new ApiError(400, 'invalid_parents_array');
            }

            const result = await studentService.createStudent(
                {
                    email,
                    phone_number,
                    given_name,
                    family_name,
                    student_number,
                    cohort,
                    parents,
                },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * PUT /:id - Update student
     */
    updateStudent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const studentId = req.params.id;
            const {
                phone_number,
                given_name,
                family_name,
                student_number: studentNumber,
                cohort,
            } = req.body;

            // Validate student ID
            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            // Normalize student_number
            const student_number = String(studentNumber ?? '').replace(
                /\D+/g,
                ''
            );

            // Validate required fields
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(400, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(400, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(400, 'invalid_or_missing_family_name');
            }
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw new ApiError(400, 'invalid_or_missing_student_number');
            }

            const result = await studentService.updateStudent(
                {
                    id: studentId,
                    phone_number,
                    given_name,
                    family_name,
                    student_number,
                    cohort,
                },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * DELETE /:id - Delete student
     */
    deleteStudent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.deleteStudent(
                parseInt(studentId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    // ==================== Relationship Endpoints ====================

    /**
     * GET /:id/parents - Get student parents
     */
    getStudentParents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.getStudentParents(
                parseInt(studentId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            return next(e);
        }
    };

    /**
     * POST /:id/parents - Change student parents
     */
    changeStudentParents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const studentId = req.params.id;
            const { parents } = req.body;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            if (
                !parents ||
                !Array.isArray(parents) ||
                !isValidArrayId(parents)
            ) {
                throw new ApiError(400, 'invalid_or_missing_parents');
            }

            const { response, newParentIds } =
                await studentService.changeStudentParents(
                    {
                        id: studentId,
                        parents,
                    },
                    req.user.school_id
                );

            // Side effect: Synchronize posts for new parents
            if (newParentIds.length > 0) {
                for (const parentId of newParentIds) {
                    await syncronizePosts(parentId, parseInt(studentId));
                }
            }

            return res.status(200).json(response).end();
        } catch (e: any) {
            return next(e);
        }
    };
}

export default StudentModuleController;
