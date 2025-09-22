import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    handleCSVUpload,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';
import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { Response, Router } from 'express';
import { generatePaginationLinks, parseKintoneRow } from '../../utils/helper';

import DB from '../../utils/db-client';
import {
    isValidString,
    isValidPhoneNumber,
    isValidStudentNumber,
    isValidEmail,
    isValidArrayId,
    isValidId,
} from '../../utils/validate';
import process from 'node:process';
import { stringify } from 'csv-stringify/sync';
import { syncronizePosts } from '../../utils/messageHelper';

// CSV upload handled by shared middleware

class StudentController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createStudent);
        this.router.post('/list', verifyToken, this.studentFilter);
        this.router.post('/ids', verifyToken, this.studentByIds);
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadStudentsFromCSV
        );
        this.router.post(
            '/kintoneUpload',
            verifyToken,
            this.kintoneUploadStudentsFromCSV
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportStudentsToCSV);

        this.router.get('/:id', verifyToken, this.studentView);
        this.router.put('/:id', verifyToken, this.studentEdit);
        this.router.delete('/:id', verifyToken, this.studentDelete);

        this.router.get('/:id/parents', verifyToken, this.studentParent);
        this.router.post('/:id/parents', verifyToken, this.changeStudentParent);
    }

    kintoneUploadStudentsFromCSV = async (
        req: ExtendedRequest,
        res: Response
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

            // ULTIMATE SSRF Protection: Server-controlled URL mapping
            // User can only select from predefined domain options
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

            // Validate subdomain format (only alphanumeric and hyphens)
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

            // Server-controlled URL construction - no user input flows directly to fetch()
            const validatedUrl = `https://${kintoneSubdomain}.${selectedDomain}/k/v1/records.json`;

            // Additional validation: Ensure kintoneToken is a valid API token format
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

            // Create AbortController for better timeout control
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
                    // Additional security options
                    redirect: 'error', // Don't follow redirects to prevent redirect-based SSRF
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

                    const rowErrors: any = {};

                    // Validate presence of required fields
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
                        rowErrors.phone_number =
                            'missing_or_empty_phone_number';
                    } else {
                        phone_number = parseKintoneRow(phone_number);
                        if (!isValidPhoneNumber(phone_number)) {
                            rowErrors.phone_number =
                                'invalid_phone_number_format';
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

                    const row = {
                        given_name,
                        family_name,
                        email,
                        phone_number,
                        student_number,
                    };

                    if (Object.keys(rowErrors).length === 0) {
                        kintoneRecords.push(row);
                    } else {
                        errors.push({
                            row,
                            errors: rowErrors,
                            record_number: record.$id?.value || 'Unknown', // Adding record number for easier tracking
                        });
                    }
                }
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

            const existingEmails =
                kintoneRecords?.length > 0
                    ? await DB.query(
                          'SELECT email FROM Student WHERE email IN (:emails)',
                          {
                              emails: kintoneRecords.map(
                                  (row: any) => row.email
                              ),
                          }
                      )
                    : [];
            const existingStudentNumbers =
                kintoneRecords?.length > 0
                    ? await DB.query(
                          'SELECT student_number FROM Student WHERE student_number IN (:studentNumbers)',
                          {
                              studentNumbers: kintoneRecords.map(
                                  (row: any) => row.student_number
                              ),
                          }
                      )
                    : [];

            const existingEmailsSet = new Set(
                existingEmails.map((email: any) => email.email)
            );
            const existingStudentNumbersSet = new Set(
                existingStudentNumbers.map(
                    (studentNumber: any) => studentNumber.student_number
                )
            );

            const createList: any[] = [];
            const updateList: any[] = [];

            for (const row of kintoneRecords) {
                const { email, student_number } = row;
                if (existingEmailsSet.has(email)) {
                    updateList.push(row);
                } else if (existingStudentNumbersSet.has(student_number)) {
                    updateList.push(row);
                } else {
                    createList.push(row);
                }
            }

            for (const row of createList) {
                await DB.execute(
                    'INSERT INTO Student(email, phone_number, given_name, family_name, student_number, school_id) VALUES (:email, :phone_number, :given_name, :family_name, :student_number, :school_id)',
                    { ...row, school_id: req.user.school_id }
                );
            }
            for (const row of updateList) {
                await DB.execute(
                    'UPDATE Student SET phone_number = :phone_number, given_name = :given_name, family_name = :family_name, student_number = :student_number WHERE student_number = :student_number',
                    row
                );
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

    exportStudentsToCSV = async (req: ExtendedRequest, res: Response) => {
        try {
            const students = await DB.query(
                `SELECT
                email, phone_number, given_name, family_name, student_number
                FROM Student
                WHERE school_id = :school_id`,
                {
                    school_id: req.user.school_id,
                }
            );

            if (students.length === 0) {
                return res
                    .status(404)
                    .json({
                        error: 'No students found',
                    })
                    .end();
            }

            const csvData = students.map((student: any) => ({
                email: student.email,
                phone_number: student.phone_number,
                given_name: student.given_name,
                family_name: student.family_name,
                student_number: student.student_number,
            }));

            const csvContent = stringify(csvData, {
                header: true,
                columns: [
                    'email',
                    'phone_number',
                    'given_name',
                    'family_name',
                    'student_number',
                ],
            });

            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header(
                'Content-Disposition',
                'attachment; filename=students.csv'
            );
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8')).end();
        } catch (e: any) {
            return res
                .status(500)
                .json({
                    error: 'internal_server_error',
                    details: e.message,
                })
                .end();
        }
    };

    uploadStudentsFromCSV = async (req: ExtendedRequest, res: Response) => {
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
                const normalized = {
                    email: String(raw.email || '').trim(),
                    phone_number: String(raw.phone_number || '').trim(),
                    given_name: String(raw.given_name || '').trim(),
                    family_name: String(raw.family_name || '').trim(),
                    student_number: String(raw.student_number || '').trim(),
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

            const existingStudents = await DB.query(
                'SELECT email, student_number FROM Student WHERE email IN (:emails) OR student_number IN (:sns)',
                {
                    emails: valid.map(v => v.email),
                    sns: valid.map(v => v.student_number),
                }
            );
            const existingEmailSet = new Set(
                existingStudents.map((s: any) => s.email)
            );
            const existingNumberSet = new Set(
                existingStudents.map((s: any) => s.student_number)
            );

            for (const row of valid) {
                if (action === 'create') {
                    if (existingEmailSet.has(row.email)) {
                        response.errors.push({
                            row,
                            errors: {
                                email: 'student_email_already_exists',
                            },
                        });
                        continue;
                    }
                    if (existingNumberSet.has(row.student_number)) {
                        response.errors.push({
                            row,
                            errors: {
                                student_number: 'student_number_already_exists',
                            },
                        });
                        continue;
                    }
                    await DB.execute(
                        `INSERT INTO Student(email, phone_number, given_name, family_name, student_number, school_id)
                         VALUE (:email, :phone_number, :given_name, :family_name, :student_number, :school_id);`,
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
                            student_number = :student_number
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
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    changeStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }

            const studentInfo = await DB.query(
                `SELECT
                id, email, given_name, family_name,
                phone_number, student_number
                FROM Student
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: studentId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'student_not_found',
                };
            }

            const student = studentInfo[0];

            const { parents } = req.body;
            if (parents && Array.isArray(parents) && isValidArrayId(parents)) {
                if (parents.length > 5) {
                    throw {
                        status: 400,
                        message: 'maximum_5_parents_allowed',
                    };
                }
                const existingParents = await DB.query(
                    `SELECT parent_id
                    FROM StudentParent
                    WHERE student_id = :student_id;`,
                    {
                        student_id: student.id,
                    }
                );

                const existingParentIds = existingParents.map(
                    (parent: any) => parent.parent_id
                );
                const newParentIds = parents.filter(
                    (id: any) => !existingParentIds.includes(id)
                );
                const removedParentIds = existingParentIds.filter(
                    (id: any) => !parents.includes(id)
                );

                if (removedParentIds.length > 0) {
                    await DB.query(
                        `DELETE FROM StudentParent
                        WHERE student_id = :student_id AND parent_id IN (:parentIds);`,
                        {
                            student_id: student.id,
                            parentIds: removedParentIds,
                        }
                    );

                    await DB.query(
                        `
                            DELETE pp
                            FROM PostParent AS pp
                            INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                            WHERE ps.student_id = :student_id AND pp.parent_id IN (:parentIds);`,
                        {
                            student_id: student.id,
                            parentIds: removedParentIds,
                        }
                    );
                }

                if (newParentIds.length > 0) {
                    const limitValidate = await DB.query(
                        `SELECT pa.id
                        FROM Parent AS pa
                        LEFT JOIN StudentParent AS sp on pa.id = sp.parent_id
                        WHERE pa.id IN (:parents)
                        GROUP BY pa.id
                        HAVING COUNT(sp.student_id) < 5;`,
                        {
                            parents: newParentIds,
                        }
                    );

                    if (limitValidate.length > 0) {
                        const validParentIds = limitValidate.map(
                            (item: any) => item.id
                        );
                        const insertData = validParentIds.map(
                            (parentId: any) => ({
                                student_id: student.id,
                                parent_id: parentId,
                            })
                        );
                        const valuesString = insertData
                            .map(
                                (item: any) =>
                                    `(${item.student_id}, ${item.parent_id})`
                            )
                            .join(', ');
                        await DB.query(`INSERT INTO StudentParent (student_id, parent_id)
                        VALUES ${valuesString};`);

                        //     for (const parentId of limitValidate) {
                        //         await DB.query(`INSERT INTO StudentParent (student_id, parent_id)
                        // VALUES (:student_id, :parent_id);`, {
                        //             student_id: student.id,
                        //             parent_id: parentId.parent_id
                        //         });
                        //     }
                    }

                    for (const parentId of newParentIds) {
                        await syncronizePosts(parentId, student.id);
                    }
                }

                return res
                    .status(200)
                    .json({
                        message: 'Parents changed successfully',
                    })
                    .end();
            } else {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parents',
                };
            }
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

    studentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }

            const studentInfo = await DB.query(
                `SELECT
                id, email, given_name, family_name,
                phone_number, student_number
                FROM Student
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: studentId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'student_not_found',
                };
            }

            const student = studentInfo[0];

            const studentParents = await DB.query(
                `SELECT pa.id, pa.given_name, pa.family_name
                FROM StudentParent AS sp
                INNER JOIN Parent AS pa on sp.parent_id = pa.id
                WHERE sp.student_id = :student_id;`,
                {
                    student_id: student.id,
                }
            );

            return res
                .status(200)
                .json({
                    student: student,
                    parents: studentParents,
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

    studentDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }
            const studentInfo = await DB.query(
                `SELECT
                id, email, given_name, family_name,
                phone_number, student_number
                FROM Student
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: studentId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'student_not_found',
                };
            }

            await DB.execute('DELETE FROM Student WHERE id = :id;', {
                id: studentId,
            });

            return res
                .status(200)
                .json({
                    message: 'studentDeleted',
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

    studentEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { phone_number, given_name, family_name, student_number } =
                req.body;

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
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_number',
                };
            }

            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }
            const studentInfo = await DB.query(
                `SELECT
                id, email FROM Student
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: studentId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Student not found',
                };
            }

            const student = studentInfo[0];

            const findDuplicates = await DB.query(
                'SELECT id, phone_number FROM Student WHERE phone_number = :phone_number',
                {
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];
                if (duplicate.id != studentId) {
                    if (phone_number == duplicate.phone_number) {
                        throw {
                            status: 401,
                            message: 'phone_number_already_exists',
                        };
                    }
                }
            }

            await DB.execute(
                `UPDATE Student SET
                        student_number = :student_number,
                        phone_number = :phone_number,
                        family_name = :family_name,
                        given_name = :given_name
                    WHERE id = :id`,
                {
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    student_number: student_number,
                    id: student.id,
                }
            );

            return res
                .status(200)
                .json({
                    student: {
                        id: student.id,
                        email: student.email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
                        student_number: student_number,
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

    studentView = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }
            const studentInfo = await DB.query(
                `SELECT
                id, email, given_name, family_name,
                phone_number, student_number
                FROM Student
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: studentId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Student not found',
                };
            }

            const student = studentInfo[0];

            const studentParents = await DB.query(
                `SELECT pa.id, pa.email,
                pa.phone_number, pa.given_name, pa.family_name
                FROM StudentParent AS sp
                INNER JOIN Parent AS pa on sp.parent_id = pa.id
                WHERE sp.student_id = :student_id;`,
                {
                    student_id: student.id,
                }
            );

            const studentGroups = await DB.query(
                `SELECT sg.id,sg.name FROM GroupMember AS gm
                INNER JOIN StudentGroup AS sg ON gm.group_id = sg.id
                WHERE student_id = :student_id AND sg.school_id = :school_id`,
                {
                    student_id: student.id,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    student: student,
                    parents: studentParents,
                    groups: studentGroups,
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

    studentByIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { studentIds } = req.body;

            if (
                studentIds &&
                Array.isArray(studentIds) &&
                isValidArrayId(studentIds)
            ) {
                const studentList = await DB.query(
                    `SELECT id,given_name, family_name
                        FROM Student WHERE id IN (:students) AND school_id = :school_id`,
                    {
                        students: studentIds,
                        school_id: req.user.school_id,
                    }
                );

                return res
                    .status(200)
                    .json({
                        studentList,
                    })
                    .end();
            } else {
                throw {
                    status: 401,
                    message: 'invalid_id_list',
                };
            }
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

    studentFilter = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const name = (req.body.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
            };

            if (name) {
                filters.push(
                    '(given_name LIKE :name OR family_name LIKE :name OR email LIKE :name OR student_number LIKE :name)'
                );
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const studentList = await DB.query(
                `SELECT
                id, email, given_name, family_name,
                phone_number, student_number
                FROM Student
                WHERE school_id = :school_id ${whereClause}
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset;`,
                params
            );

            const totalStudents = (
                await DB.query(
                    `SELECT COUNT(*) as total
                FROM Student WHERE school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            return res
                .status(200)
                .json({
                    students: studentList,
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

    createStudent = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                email,
                phone_number,
                given_name,
                family_name,
                student_number,
                parents,
            } = req.body;

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
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_number',
                };
            }
            if (parents && Array.isArray(parents)) {
                if (parents.length > 5) {
                    throw { status: 400, message: 'maximum_5_parents_allowed' };
                }
            }

            const findDuplicates = await DB.query(
                'SELECT email, phone_number, student_number FROM Student WHERE email = :email OR phone_number = :phone_number OR student_number = :student_number',
                {
                    email: email,
                    phone_number: phone_number,
                    student_number: student_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];

                if (email == duplicate.email) {
                    throw {
                        status: 401,
                        message: 'email_already_exists',
                    };
                }
                if (phone_number == duplicate.phone_number) {
                    throw {
                        status: 401,
                        message: 'phone_number_already_exists',
                    };
                }
                if (student_number == duplicate.student_number) {
                    throw {
                        status: 401,
                        message: 'student_number_already_exists',
                    };
                }
            }

            const studentInsert = await DB.execute(
                `INSERT INTO Student(email, phone_number, given_name, family_name, student_number, school_id)
                VALUE (:email,:phone_number,:given_name,:family_name,:student_number,:school_id)`,
                {
                    email: email,
                    phone_number: phone_number,
                    given_name: given_name,
                    family_name: family_name,
                    student_number: student_number,
                    school_id: req.user.school_id,
                }
            );

            const studentId = studentInsert.insertId;
            const attachedParents: any[] = [];
            if (
                parents &&
                Array.isArray(parents) &&
                isValidArrayId(parents) &&
                parents.length > 0
            ) {
                const parentRows = await DB.query(
                    `SELECT pa.id
                        FROM Parent AS pa
                        LEFT JOIN StudentParent AS sp on pa.id = sp.parent_id
                        WHERE pa.id IN (:parents)
                        GROUP BY pa.id
                        HAVING COUNT(sp.student_id) < 5;`,
                    {
                        parents: parents,
                    }
                );

                if (parentRows.length > 0) {
                    const values = parentRows
                        .map((parent: any) => `(${parent.id}, ${studentId})`)
                        .join(', ');
                    await DB.execute(
                        `INSERT INTO StudentParent (parent_id, student_id) VALUES ${values}`
                    );

                    const parentList = await DB.query(
                        `SELECT pa.id,pa.email,pa.phone_number,pa.given_name,pa.family_name
                        FROM Parent as pa
                        INNER JOIN StudentParent as sp
                        ON sp.parent_id = pa.id AND sp.student_id = :student_id`,
                        {
                            student_id: studentId,
                        }
                    );

                    attachedParents.push(...parentList);
                }
            }

            return res
                .status(200)
                .json({
                    student: {
                        id: studentId,
                        email: email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
                        student_number: student_number,
                        parents: attachedParents,
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
                'student_number',
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
            console.error('Error generating CSV template:', e);
            return res.status(500).json({ error: 'internal_server_error' });
        }
    };
}

export default StudentController;
