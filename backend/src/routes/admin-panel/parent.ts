import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';
import { Parent } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import DB from '../../utils/db-client';

import {
    isValidString,
    isValidPhoneNumber,
    isValidEmail,
    isValidArrayId,
    isValidId,
    isValidStudentNumber,
} from '../../utils/validate';
import process from 'node:process';
import { generatePaginationLinks, parseKintoneRow } from '../../utils/helper';
// Removed Readable import (not used in shared parsing path)
import { stringify } from 'csv-stringify/sync';
import { syncronizePosts } from '../../utils/messageHelper';
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

// Type definitions for better error handling
interface ParentCSVRow extends CSVRowBase {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_numbers: string[];
}

type ParentRowError = GenericRowError<ParentCSVRow>;

// Removed custom multer setup in favor of shared handleCSVUpload

class ParentController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;

    constructor() {
        this.cognitoClient =
            process.env.USE_MOCK_COGNITO === 'true'
                ? MockCognitoClient
                : Parent;
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createParent);
        this.router.post('/list', verifyToken, this.parentList);
        this.router.post(
            '/list/detailed',
            verifyToken,
            this.detailedParentList
        );
        this.router.post('/ids', verifyToken, this.parentIds);
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

        this.router.get('/:id', verifyToken, this.parentView);
        this.router.post('/get-details', verifyToken, this.parentViewSecure); // Secure POST endpoint for sensitive data
        this.router.put('/:id', verifyToken, this.parentEdit);
        this.router.delete('/:id', verifyToken, this.parentDelete);
        this.router.post(
            '/:id/resend-password',
            verifyToken,
            this.resendTemporaryPassword
        );

        this.router.get('/:id/students', verifyToken, this.parentStudents);
        this.router.post(
            '/get-students',
            verifyToken,
            this.parentStudentsSecure
        ); // Secure POST endpoint for sensitive data
        this.router.post(
            '/:id/students',
            verifyToken,
            this.changeParentStudents
        );
    }

    resendTemporaryPassword = async (req: ExtendedRequest, res: Response) => {
        try {
            const parentId = req.params.id;

            if (!isValidId(parentId)) {
                return res
                    .status(400)
                    .json({
                        error: 'Invalid parent ID',
                    })
                    .end();
            }

            // Get parent from database to get their email
            const parents = await DB.query(
                `
                SELECT
                    p.email,
                    p.phone_number,
                    p.given_name,
                    p.family_name
                FROM Parent p
                WHERE p.id = :parentId
            `,
                {
                    parentId: parentId,
                }
            );

            if (parents.length === 0) {
                return res
                    .status(404)
                    .json({
                        error: 'Parent not found',
                    })
                    .end();
            }

            const parent = parents[0];

            // Format phone number with + prefix for Cognito (if not already present)
            const phoneNumber = parent.phone_number.startsWith('+')
                ? parent.phone_number
                : `+${parent.phone_number}`;

            // Use Cognito client to resend temporary password
            const result =
                await this.cognitoClient.resendTemporaryPassword(phoneNumber);

            const parentName =
                `${parent.given_name ?? ''} ${parent.family_name ?? ''}`.trim() ||
                parent.email ||
                parent.phone_number;

            return res
                .status(200)
                .json({
                    message: result.message,
                    parent_name: parentName,
                    email: parent.email,
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
                // names can be optional; keep fields optional as well
                !email_field ||
                !phone_number_field ||
                !student_number_field
            ) {
                throw new Error(
                    'kintoneSubdomain, kintoneDomain, kintoneToken, email_field, phone_number_field, student_number_field are required'
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

            let data: any;
            const errors: any[] = [];

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
                // Names are optional. If present, validate; otherwise set null later
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

                let row = {
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

            console.log(existingEmails, existingPhoneNumbers);

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

                await syncronizePosts(parentId, student.id);
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

            for (const parent of parents) {
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
            for (const parent of parents) {
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
        try {
            const rawRows = await parseCSVBuffer(req.file.buffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return res.status(200).json(response).end();
            }

            // Normalize + validate
            const seenEmails = new Set<string>();
            const seenPhones = new Set<string>();
            const valid: ParentCSVRow[] = [];
            const errors: ParentRowError[] = [];

            for (const row of rawRows) {
                const normalized: ParentCSVRow = {
                    email: String(row.email || '').trim(),
                    phone_number: String(row.phone_number || '').trim(),
                    given_name: String(row.given_name || '').trim(),
                    family_name: String(row.family_name || '').trim(),
                    student_numbers: String(row.student_numbers || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                };
                const rowErrors: Record<string, string> = {};
                if (!isValidEmail(normalized.email))
                    rowErrors.email = ErrorKeys.invalid_email;
                if (!isValidPhoneNumber(normalized.phone_number))
                    rowErrors.phone_number = ErrorKeys.invalid_phone_number;
                // Names optional in CSV; if provided then validate
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
                // validate each student number if present
                for (const sn of normalized.student_numbers) {
                    if (!isValidStudentNumber(sn)) {
                        rowErrors.student_numbers =
                            ErrorKeys.invalid_student_number;
                        break;
                    }
                }
                if (seenEmails.has(normalized.email))
                    rowErrors.email = ErrorKeys.email_already_exists;
                if (seenPhones.has(normalized.phone_number))
                    rowErrors.phone_number = ErrorKeys.phone_already_exists;

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({ row: normalized, errors: rowErrors });
                } else {
                    seenEmails.add(normalized.email);
                    seenPhones.add(normalized.phone_number);
                    valid.push(normalized);
                }
            }

            if (errors.length && throwErrors) {
                response.errors = errors;
                response.summary.errors = errors.length;
                return res.status(400).json(response).end();
            }

            // Transaction for DB ops
            connection = await DB.beginTransaction();

            // Fetch existing parents (by email & phone)
            const existing = await DB.queryWithConnection(
                connection,
                'SELECT id, email, phone_number FROM Parent WHERE (email IN (:emails) OR phone_number IN (:phones)) AND school_id = :sid',
                {
                    emails: valid.map(v => v.email),
                    phones: valid.map(v => v.phone_number),
                    sid: req.user.school_id,
                }
            );
            const emailToId = new Map(
                existing.map((p: any) => [p.email, p.id])
            );
            const phoneToId = new Map(
                existing.map((p: any) => [p.phone_number, p.id])
            );

            for (const row of valid) {
                try {
                    if (action === 'create') {
                        if (emailToId.has(row.email)) {
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
                            row.email,
                            phone_number
                        );
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
                        if (!emailToId.has(row.email)) {
                            response.errors.push({
                                row,
                                errors: {
                                    email: ErrorKeys.admin_does_not_exist, // TODO: introduce parent_does_not_exist constant
                                },
                            });
                            continue;
                        }
                        const pid = emailToId.get(row.email);
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
                        // Update student relationships (replace set)
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
                                { pid, ids: toRemove.map((s: any) => s.id) }
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
                        if (!emailToId.has(row.email)) {
                            response.errors.push({
                                row,
                                errors: {
                                    email: ErrorKeys.admin_does_not_exist, // TODO: introduce parent_does_not_exist constant
                                },
                            });
                            continue;
                        }
                        const pid = emailToId.get(row.email);
                        await this.cognitoClient.delete(`+${row.phone_number}`);
                        await DB.executeWithConnection(
                            connection,
                            'DELETE FROM Parent WHERE id = :id AND school_id = :sid',
                            { id: pid, sid: req.user.school_id }
                        );
                        response.deleted.push(row);
                    }
                } catch (_) {
                    void _; // explicitly ignore
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
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    private async attachStudentsToParent(
        connection: Connection,
        parentId: number,
        studentNumbers: string[]
    ): Promise<any[]> {
        if (!studentNumbers || studentNumbers.length === 0) {
            return [];
        }

        const studentRows = await DB.queryWithConnection(
            connection,
            `SELECT id FROM Student WHERE student_number IN (:student_numbers)`,
            { student_numbers: studentNumbers }
        );

        if (studentRows.length > 0) {
            const values = studentRows
                .map((student: any) => `(${student.id}, ${parentId})`)
                .join(', ');

            await DB.executeWithConnection(
                connection,
                `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
            );

            // Sync posts for each attached student
            for (const student of studentRows) {
                await syncronizePosts(parentId, student.id);
            }

            return studentRows;
        }

        return [];
    }

    private async updateStudentRelationships(
        connection: Connection,
        parentId: number,
        studentNumbers: string[]
    ): Promise<any[]> {
        // Get existing students
        const existingStudents = await DB.queryWithConnection(
            connection,
            `SELECT st.id, student_number
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON sp.student_id = st.id
            WHERE sp.parent_id = :parent_id`,
            { parent_id: parentId }
        );

        // Get future students
        const futureStudents =
            studentNumbers.length > 0
                ? await DB.queryWithConnection(
                      connection,
                      `SELECT id, student_number FROM Student WHERE student_number IN (:student_numbers)`,
                      { student_numbers: studentNumbers }
                  )
                : [];

        // Find students to remove and add
        const deletedStudents = existingStudents.filter(
            (existing: any) =>
                !futureStudents.some(
                    (future: any) =>
                        future.student_number === existing.student_number
                )
        );

        const newStudents = futureStudents.filter(
            (future: any) =>
                !existingStudents.some(
                    (existing: any) =>
                        existing.student_number === future.student_number
                )
        );

        // Remove students
        if (deletedStudents.length > 0) {
            for (const student of deletedStudents) {
                await DB.executeWithConnection(
                    connection,
                    `DELETE FROM StudentParent WHERE parent_id = :parent_id AND student_id = :student_id`,
                    {
                        parent_id: parentId,
                        student_id: student.id,
                    }
                );
            }
        }

        // Add new students
        if (newStudents.length > 0) {
            const values = newStudents
                .map((student: any) => `(${student.id}, ${parentId})`)
                .join(', ');

            await DB.executeWithConnection(
                connection,
                `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
            );

            // Sync posts for new students
            for (const student of newStudents) {
                await syncronizePosts(parentId, student.id);
            }
        }

        return newStudents;
    }

    // Legacy generateErrorCSV removed; shared utility builds error CSV when needed

    changeParentStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const parentId = req.params.id;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }

            const parentInfo = await DB.query(
                `SELECT
                    id, email, phone_number,
                    given_name, family_name, created_at
                    FROM Parent
                    WHERE id = :id AND school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            const { students } = req.body;
            if (students.length >= 6) {
                throw {
                    status: 404,
                    message: 'parent_cant_attach_more_than_5_students',
                };
            }
            if (
                students &&
                Array.isArray(students) &&
                isValidArrayId(students)
            ) {
                const existingStudents = await DB.query(
                    `SELECT student_id
                    FROM StudentParent
                    WHERE parent_id = :parent_id;`,
                    {
                        parent_id: parent.id,
                    }
                );

                const existingStudentIds = existingStudents.map(
                    (student: any) => student.student_id
                );
                const newStudentIds = students.filter(
                    (id: any) => !existingStudentIds.includes(id)
                );
                const removedStudentIds = existingStudentIds.filter(
                    (id: any) => !students.includes(id)
                );

                if (removedStudentIds.length > 0) {
                    await DB.query(
                        `DELETE FROM StudentParent
                        WHERE parent_id = :parent_id AND student_id IN (:studentIds);`,
                        {
                            parent_id: parent.id,
                            studentIds: removedStudentIds,
                        }
                    );

                    await DB.query(
                        `DELETE pp
                        FROM PostStudent AS ps
                        INNER JOIN PostParent AS pp ON pp.post_student_id = ps.id
                        WHERE pp.parent_id = :parent_id AND ps.student_id IN (:studentIds);`,
                        {
                            parent_id: parent.id,
                            studentIds: removedStudentIds,
                        }
                    );
                }

                if (newStudentIds.length > 0) {
                    const insertData = newStudentIds.map((studentId: any) => ({
                        student_id: studentId,
                        parent_id: parent.id,
                    }));
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

                    for (const studentId of newStudentIds) {
                        await syncronizePosts(parent.id, studentId);
                    }
                }

                return res
                    .status(200)
                    .json({
                        message: 'Students changed successfully',
                    })
                    .end();
            } else {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_students',
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

    parentStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const parentId = req.params.id;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }

            const parentInfo = await DB.query(
                `SELECT
                    id, email, phone_number,
                    given_name, family_name, created_at
                    FROM Parent
                    WHERE id = :id AND school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            const parentStudents = await DB.query(
                `SELECT st.id, st.given_name, st.family_name
                FROM StudentParent AS sp
                INNER JOIN Student AS st on sp.student_id = st.id
                WHERE sp.parent_id = :parent_id;`,
                {
                    parent_id: parent.id,
                }
            );

            return res
                .status(200)
                .json({
                    parent: parent,
                    students: parentStudents,
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

    parentIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { parentIds } = req.body;

            if (
                parentIds &&
                Array.isArray(parentIds) &&
                isValidArrayId(parentIds)
            ) {
                const parentList = await DB.query(
                    `SELECT p.id,
                            p.email,
                            p.phone_number,
                            COALESCE(NULLIF(p.given_name,''), fs.given_name, '') AS given_name,
                            COALESCE(NULLIF(p.family_name,''), fs.family_name, '') AS family_name
                     FROM Parent p
                     LEFT JOIN (
                        SELECT sp.parent_id,
                               MIN(st.given_name) AS given_name,
                               MIN(st.family_name) AS family_name
                        FROM StudentParent sp
                        INNER JOIN Student st ON st.id = sp.student_id
                        GROUP BY sp.parent_id
                     ) fs ON fs.parent_id = p.id
                     WHERE p.id IN (:parents) AND p.school_id = :school_id`,
                    {
                        parents: parentIds,
                        school_id: req.user.school_id,
                    }
                );

                return res
                    .status(200)
                    .json({
                        parents: parentList,
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

    parentDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const parentId = req.params.id;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }
            const parentInfo = await DB.query(
                `SELECT
                id, cognito_sub_id, email,
                phone_number, given_name,
                family_name, created_at, last_login_at
                FROM Parent
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            await this.cognitoClient.delete(`+${parent.phone_number}`);

            await DB.execute('DELETE FROM Parent WHERE id = :id;', {
                id: parent.id,
            });

            return res
                .status(200)
                .json({
                    message: 'parentDeleted',
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

    parentEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const { email } = req.body;
            let { given_name, family_name } = req.body as any;

            if (!email || !isValidEmail(email)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_email',
                };
            }
            // Names are optional; if provided (non-empty), validate, else set to null
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw { status: 401, message: 'invalid_or_missing_given_name' };
            }
            if (family_name && !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const parentId = req.params.id;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }
            const parentInfo = await DB.query(
                `SELECT id,
                       email,
                       given_name, family_name,
                       created_at
                FROM Parent
                WHERE id = :id AND school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            const findDuplicates = await DB.query(
                `SELECT id, email FROM Parent WHERE email = :email`,
                {
                    email: email,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];
                if (duplicate.id != parentId) {
                    if (email === duplicate.email) {
                        throw {
                            status: 401,
                            message: 'email_already_exists',
                        };
                    }
                }
            }

            await DB.execute(
                `UPDATE Parent SET
                        email = :email,
                        family_name = :family_name,
                        given_name = :given_name
                    WHERE id = :id`,
                {
                    email: email,
                    given_name: given_name || '',
                    family_name: family_name || '',
                    id: parent.id,
                }
            );

            return res
                .status(200)
                .json({
                    parent: {
                        id: parent.id,
                        email: email,
                        phone_number: parent.phone_number,
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

    parentView = async (req: ExtendedRequest, res: Response) => {
        try {
            const parentId = req.params.id;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }
            const parentInfo = await DB.query(
                `SELECT p.id,
                        p.email,
                        p.phone_number,
                        COALESCE(NULLIF(p.given_name,''), fs.given_name, '') AS given_name,
                        COALESCE(NULLIF(p.family_name,''), fs.family_name, '') AS family_name,
                        p.created_at
                 FROM Parent p
                 LEFT JOIN (
                    SELECT sp.parent_id,
                           MIN(st.given_name) AS given_name,
                           MIN(st.family_name) AS family_name
                    FROM StudentParent sp
                    INNER JOIN Student st ON st.id = sp.student_id
                    GROUP BY sp.parent_id
                 ) fs ON fs.parent_id = p.id
                 WHERE p.id = :id
                 AND p.school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            const parentStudents = await DB.query(
                `SELECT
                    st.id, st.email, st.phone_number,
                    st.given_name, st.family_name, st.student_number
                FROM StudentParent AS sp
                INNER JOIN Student AS st ON sp.student_id = st.id
                WHERE sp.parent_id = :parent_id;`,
                {
                    parent_id: parent.id,
                }
            );

            return res
                .status(200)
                .json({
                    parent: parent,
                    students: parentStudents,
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

    // Secure POST version of parentView for sensitive data
    parentViewSecure = async (req: ExtendedRequest, res: Response) => {
        try {
            // Get ID from request body instead of URL parameters for better security
            const { parentId } = req.body;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_parent_id',
                };
            }
            const parentInfo = await DB.query(
                `SELECT p.id,
                        p.email,
                        p.phone_number,
                        COALESCE(NULLIF(p.given_name,''), fs.given_name, '') AS given_name,
                        COALESCE(NULLIF(p.family_name,''), fs.family_name, '') AS family_name,
                        p.created_at
                 FROM Parent p
                 LEFT JOIN (
                    SELECT sp.parent_id,
                           MIN(st.given_name) AS given_name,
                           MIN(st.family_name) AS family_name
                    FROM StudentParent sp
                    INNER JOIN Student st ON st.id = sp.student_id
                    GROUP BY sp.parent_id
                 ) fs ON fs.parent_id = p.id
                 WHERE p.id = :id
                 AND p.school_id = :school_id`,
                {
                    id: parentId,
                    school_id: req.user.school_id,
                }
            );

            if (parentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'parent_not_found',
                };
            }

            const parent = parentInfo[0];

            const parentStudents = await DB.query(
                `SELECT
                    st.id, st.email, st.phone_number,
                    st.given_name, st.family_name, st.student_number
                FROM StudentParent AS sp
                INNER JOIN Student AS st ON sp.student_id = st.id
                WHERE sp.parent_id = :parent_id;`,
                {
                    parent_id: parent.id,
                }
            );

            return res
                .status(200)
                .json({
                    parent: parent,
                    students: parentStudents,
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

    // Secure POST version of parentStudents for sensitive data
    parentStudentsSecure = async (req: ExtendedRequest, res: Response) => {
        try {
            // Get ID from request body instead of URL parameters for better security
            const { parentId } = req.body;

            if (!parentId || !isValidId(parentId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_parent_id',
                };
            }

            const parentStudents = await DB.query(
                `SELECT
                    st.id, st.email, st.phone_number,
                    st.given_name, st.family_name, st.student_number
                FROM StudentParent AS sp
                INNER JOIN Student AS st ON sp.student_id = st.id
                INNER JOIN Parent AS pa ON sp.parent_id = pa.id
                WHERE sp.parent_id = :parent_id
                AND pa.school_id = :school_id;`,
                {
                    parent_id: parentId,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    students: parentStudents,
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

    detailedParentList = async (req: ExtendedRequest, res: Response) => {
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
                    '((p.given_name LIKE :name OR p.family_name LIKE :name) OR EXISTS (SELECT 1 FROM StudentParent sp INNER JOIN Student st ON st.id = sp.student_id WHERE sp.parent_id = p.id AND (st.given_name LIKE :name OR st.family_name LIKE :name)))'
                );
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const parentList = await DB.query(
                `SELECT
                    p.id,
                    p.email,
                    p.phone_number,
                    COALESCE(NULLIF(p.given_name,''), fs.given_name, '') AS given_name,
                    COALESCE(NULLIF(p.family_name,''), fs.family_name, '') AS family_name
                 FROM Parent p
                 LEFT JOIN (
                    SELECT sp.parent_id,
                           MIN(st.given_name) AS given_name,
                           MIN(st.family_name) AS family_name
                    FROM StudentParent sp
                    INNER JOIN Student st ON st.id = sp.student_id
                    GROUP BY sp.parent_id
                 ) fs ON fs.parent_id = p.id
                 WHERE p.school_id = :school_id ${whereClause}
                 ORDER BY p.id DESC
                 LIMIT :limit OFFSET :offset;`,
                params
            );

            const totalParents = (
                await DB.query(
                    `SELECT COUNT(*) as total
                     FROM Parent p
                     WHERE p.school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalParents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_parents: totalParents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            const parentIds = parentList.map((parent: any) => parent.id);
            let relationStudentList;
            if (parentIds.length) {
                relationStudentList = await DB.query(
                    `SELECT
                        st.id,
                        st.given_name, st.family_name,
                        sp.parent_id AS parent_id
                    FROM StudentParent AS sp
                    INNER JOIN Student AS st ON sp.student_id = st.id
                    WHERE sp.parent_id IN (:parentIds) AND st.school_id = :school_id;`,
                    {
                        parentIds: parentIds,
                        school_id: req.user.school_id,
                    }
                );
            } else {
                relationStudentList = [];
            }

            const StudentMap = new Map();
            relationStudentList.forEach((student: any) => {
                const students = StudentMap.get(student.parent_id) || [];
                students.push({
                    id: student.id,
                    given_name: student.given_name,
                    family_name: student.family_name,
                });
                StudentMap.set(student.parent_id, students);
            });

            const parentWithStudent = parentList.map((parent: any) => ({
                ...parent,
                students: StudentMap.get(parent.id) || [],
            }));

            return res
                .status(200)
                .json({
                    parents: parentWithStudent,
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
                console.log(e);
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    parentList = async (req: ExtendedRequest, res: Response) => {
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
                    '((p.given_name LIKE :name OR p.family_name LIKE :name) OR EXISTS (SELECT 1 FROM StudentParent sp INNER JOIN Student st ON st.id = sp.student_id WHERE sp.parent_id = p.id AND (st.given_name LIKE :name OR st.family_name LIKE :name)))'
                );
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const parentList = await DB.query(
                `SELECT
                    p.id,
                    p.email,
                    p.phone_number,
                    COALESCE(NULLIF(p.given_name,''), fs.given_name, '') AS given_name,
                    COALESCE(NULLIF(p.family_name,''), fs.family_name, '') AS family_name
                 FROM Parent p
                 LEFT JOIN (
                    SELECT sp.parent_id,
                           MIN(st.given_name) AS given_name,
                           MIN(st.family_name) AS family_name
                    FROM StudentParent sp
                    INNER JOIN Student st ON st.id = sp.student_id
                    GROUP BY sp.parent_id
                 ) fs ON fs.parent_id = p.id
                 WHERE p.school_id = :school_id ${whereClause}
                 ORDER BY p.id DESC
                 LIMIT :limit OFFSET :offset;`,
                params
            );

            const totalParents = (
                await DB.query(
                    `SELECT COUNT(*) as total
                     FROM Parent p
                     WHERE p.school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalParents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_parents: totalParents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            // Also fetch related students to support side-by-side/accordion UI
            const parentIds = parentList.map((p: any) => p.id);
            let studentsByParent: Record<number, any[]> = {};
            if (parentIds.length) {
                const rel = await DB.query(
                    `SELECT sp.parent_id, st.id, st.given_name, st.family_name, st.student_number
                     FROM StudentParent sp
                     INNER JOIN Student st ON st.id = sp.student_id
                     WHERE sp.parent_id IN (:ids)`,
                    { ids: parentIds }
                );
                for (const r of rel) {
                    (studentsByParent[r.parent_id] ||= []).push({
                        id: r.id,
                        given_name: r.given_name,
                        family_name: r.family_name,
                        student_number: r.student_number,
                    });
                }
            }

            const parents = parentList.map((p: any) => ({
                ...p,
                students: studentsByParent[p.id] || [],
            }));

            return res
                .status(200)
                .json({
                    parents,
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

    createParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const { email, phone_number, students } = req.body;
            let { given_name, family_name } = req.body as any;

            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_phone',
                };
            }
            // Names optional; validate if provided (non-empty)
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw { status: 401, message: 'invalid_or_missing_given_name' };
            }
            if (family_name && !isValidString(family_name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_family_name',
                };
            }

            const findDuplicates = await DB.query(
                'SELECT phone_number,email FROM Parent WHERE phone_number = :phone_number OR email = :email;',
                {
                    email: email || null,
                    phone_number: phone_number,
                }
            );

            if (findDuplicates.length >= 1) {
                const duplicate = findDuplicates[0];

                if (
                    email === duplicate.email &&
                    phone_number == duplicate.phone_number
                ) {
                    throw {
                        status: 401,
                        message: 'email_and_phone_number_already_exist',
                    };
                }
                if (phone_number === duplicate.phone_number) {
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

            const phoneNumber = `+${phone_number}`;
            const parent = await this.cognitoClient.register(
                phoneNumber,
                email,
                phoneNumber
            );

            const parentInsert = await DB.execute(
                `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
    VALUE (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id);`,
                {
                    cognito_sub_id: parent.sub_id,
                    email: email || null,
                    phone_number: phone_number,
                    given_name: given_name || '',
                    family_name: family_name || '',
                    school_id: req.user.school_id,
                }
            );

            const parentId = parentInsert.insertId;
            const attachedStudents: any[] = [];
            if (
                students &&
                Array.isArray(students) &&
                isValidArrayId(students) &&
                students.length > 0 &&
                students.length <= 5
            ) {
                const studentAttachList = await DB.query(
                    `SELECT st.id
                    FROM Student AS st
                    WHERE st.id IN (:students);`,
                    {
                        students: students,
                    }
                );

                if (studentAttachList.length > 0) {
                    const values = studentAttachList
                        .map((student: any) => `(${parentId}, ${student.id})`)
                        .join(', ');
                    await DB.execute(
                        `INSERT INTO StudentParent (parent_id, student_id) VALUES ${values}`
                    );
                    const studentList = await DB.query(
                        `SELECT st.id,st.email,st.phone_number,st.given_name,st.family_name,st.student_number
                            FROM Student as st
                            INNER JOIN StudentParent as sp
                            ON sp.student_id = st.id AND sp.parent_id = :parent_id`,
                        {
                            parent_id: parentId,
                        }
                    );

                    attachedStudents.push(...studentList);
                }

                for (const student of attachedStudents) {
                    await syncronizePosts(parentId, student.id);
                }
            }

            return res
                .status(200)
                .json({
                    parent: {
                        id: parentId,
                        email: email,
                        phone_number: phone_number,
                        given_name: given_name,
                        family_name: family_name,
                        students: attachedStudents,
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
                console.log(e);
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

export default ParentController;
