// Parent Service: Business logic layer

import { parentRepository } from './parent.repository';
import { ApiError } from '../../errors/ApiError';
import { config } from '../../config';
import { generatePaginationLinks } from '../../utils/helper';
import { parseKintoneRow } from '../../utils/helper';
import DB from '../../utils/db-client';
import { Connection } from 'mysql2/promise';
import {
    isValidEmail,
    isValidPhoneNumber,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import { stringify } from 'csv-stringify/sync';
import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    RowError as GenericRowError,
    CSVRowBase,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';
import { syncronizePosts } from '../../utils/messageHelper';
import {
    GetParentsByIdsRequest,
    GetParentsByIdsResponse,
    GetParentListRequest,
    GetParentListResponse,
    GetParentDetailRequest,
    GetParentDetailResponse,
    GetDetailedParentListRequest,
    GetDetailedParentListResponse,
    CreateParentRequest,
    CreateParentResponse,
    UpdateParentRequest,
    UpdateParentResponse,
    DeleteParentRequest,
    DeleteParentResponse,
    ResendPasswordRequest,
    ResendPasswordResponse,
    BulkResendPasswordRequest,
    BulkResendPasswordResponse,
    GetParentStudentsRequest,
    GetParentStudentsResponse,
    GetParentStudentsSecureRequest,
    GetParentStudentsSecureResponse,
    ChangeParentStudentsRequest,
    ChangeParentStudentsResponse,
} from './types/parent.dto';

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

export interface ExportParentsToCSVResult {
    csvContent: string;
    filename: string;
    contentType: string;
}

class ParentService {
    private cognitoClient: CognitoClient;

    constructor(cognitoClient: CognitoClient) {
        this.cognitoClient = cognitoClient;
    }
    /**
     * Get parents by their IDs
     */
    async getParentsByIds(
        params: GetParentsByIdsRequest
    ): Promise<GetParentsByIdsResponse> {
        // Validate IDs (business rule: must be positive integers)
        const invalidIds = params.parentIds.filter(id => id <= 0);
        if (invalidIds.length > 0) {
            throw ApiError.badRequest('Invalid parent IDs');
        }

        // Repository call
        const parents = await parentRepository.findByIds(
            params.parentIds,
            params.schoolId
        );

        return {
            parents,
        };
    }

    /**
     * Get paginated list of parents with filters
     */
    async getParentList(
        params: GetParentListRequest
    ): Promise<GetParentListResponse> {
        const limit = config.PER_PAGE;
        const offset = (params.page - 1) * limit;

        // Repository calls
        const [parentRows, totalParents] = await Promise.all([
            parentRepository.findWithPagination(
                params.schoolId,
                limit,
                offset,
                {
                    email: params.email,
                    phone_number: params.phone_number,
                    name: params.name,
                    showOnlyNonLoggedIn: params.showOnlyNonLoggedIn,
                }
            ),
            parentRepository.countWithFilters(params.schoolId, {
                email: params.email,
                phone_number: params.phone_number,
                name: params.name,
                showOnlyNonLoggedIn: params.showOnlyNonLoggedIn,
            }),
        ]);

        // Calculate pagination
        const totalPages = Math.ceil(totalParents / limit);
        const pagination = {
            current_page: params.page,
            per_page: limit,
            total_pages: totalPages,
            total_parents: totalParents,
            next_page: params.page < totalPages ? params.page + 1 : null,
            prev_page: params.page > 1 ? params.page - 1 : null,
            links: generatePaginationLinks(params.page, totalPages),
        };

        // Fetch related students
        const parentIds = parentRows.map(p => p.id);
        let studentsByParent: Record<
            number,
            Array<{
                id: number;
                given_name: string;
                family_name: string;
                student_number: string;
            }>
        > = {};

        if (parentIds.length > 0) {
            const students =
                await parentRepository.findStudentsByParentIds(parentIds);
            for (const student of students) {
                if (!studentsByParent[student.parent_id]) {
                    studentsByParent[student.parent_id] = [];
                }
                studentsByParent[student.parent_id].push({
                    id: student.id,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number,
                });
            }
        }

        // Transform data
        const parents = parentRows.map(p => ({
            id: p.id,
            email: p.email,
            phone_number: p.phone_number,
            given_name: p.given_name,
            family_name: p.family_name,
            last_login_at: p.last_login_at,
            arn: p.arn,
            students: studentsByParent[p.id] || [],
        }));

        return {
            parents,
            pagination,
        };
    }

    /**
     * Get parent detail by ID
     */
    async getParentDetail(
        params: GetParentDetailRequest
    ): Promise<GetParentDetailResponse> {
        // Repository calls
        const [parent, students] = await Promise.all([
            parentRepository.findById(params.parentId, params.schoolId),
            parentRepository.findStudentsByParentId(parseInt(params.parentId)),
        ]);

        if (!parent) {
            throw ApiError.notFound('Parent not found');
        }

        return {
            parent: {
                id: parent.id,
                email: parent.email,
                phone_number: parent.phone_number,
                given_name: parent.given_name,
                family_name: parent.family_name,
                created_at: parent.created_at,
                last_login_at: parent.last_login_at,
                arn: parent.arn,
            },
            students,
        };
    }

    /**
     * Get detailed list of parents (includes arn field)
     */
    async getDetailedParentList(
        params: GetDetailedParentListRequest
    ): Promise<GetDetailedParentListResponse> {
        const limit = config.PER_PAGE;
        const offset = (params.page - 1) * limit;

        // Repository calls
        const [parentRows, totalParents] = await Promise.all([
            parentRepository.findWithPagination(
                params.schoolId,
                limit,
                offset,
                {
                    email: params.email,
                    phone_number: params.phone_number,
                    name: params.name,
                }
            ),
            parentRepository.countWithFilters(params.schoolId, {
                email: params.email,
                phone_number: params.phone_number,
                name: params.name,
            }),
        ]);

        // Calculate pagination
        const totalPages = Math.ceil(totalParents / limit);
        const pagination = {
            current_page: params.page,
            per_page: limit,
            total_pages: totalPages,
            total_parents: totalParents,
            next_page: params.page < totalPages ? params.page + 1 : null,
            prev_page: params.page > 1 ? params.page - 1 : null,
            links: generatePaginationLinks(params.page, totalPages),
        };

        // Fetch related students
        const parentIds = parentRows.map(p => p.id);
        let studentsByParent: Record<
            number,
            Array<{
                id: number;
                given_name: string;
                family_name: string;
                student_number: string;
            }>
        > = {};

        if (parentIds.length > 0) {
            const students =
                await parentRepository.findStudentsByParentIds(parentIds);
            for (const student of students) {
                if (!studentsByParent[student.parent_id]) {
                    studentsByParent[student.parent_id] = [];
                }
                studentsByParent[student.parent_id].push({
                    id: student.id,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number,
                });
            }
        }

        // Transform data
        const parents = parentRows.map(p => ({
            id: p.id,
            email: p.email,
            phone_number: p.phone_number,
            given_name: p.given_name,
            family_name: p.family_name,
            arn: p.arn,
            students: studentsByParent[p.id] || [],
        }));

        return {
            parents,
            pagination,
        };
    }

    /**
     * Create a new parent
     */
    async createParent(
        params: CreateParentRequest
    ): Promise<CreateParentResponse> {
        // Check for duplicates
        const duplicates = await parentRepository.findDuplicateByEmailOrPhone(
            params.email,
            params.phone_number
        );

        if (duplicates.length > 0) {
            const duplicate = duplicates[0];
            if (
                params.email &&
                params.email === duplicate.email &&
                params.phone_number === duplicate.phone_number
            ) {
                throw ApiError.badRequest(
                    'email_and_phone_number_already_exist'
                );
            }
            if (params.phone_number === duplicate.phone_number) {
                throw ApiError.badRequest('phone_number_already_exists');
            } else if (params.email && params.email === duplicate.email) {
                throw ApiError.badRequest('email_already_exists');
            }
        }

        // Register in Cognito
        const phoneNumber = `+${params.phone_number}`;
        const cognitoParent = await this.cognitoClient.register(
            phoneNumber,
            params.email,
            phoneNumber
        );

        // Create in database
        const parentId = await parentRepository.create({
            cognito_sub_id: cognitoParent.sub_id,
            email: params.email,
            phone_number: params.phone_number,
            given_name: params.given_name || '',
            family_name: params.family_name || '',
            school_id: params.schoolId,
        });

        // Attach students if provided
        let attachedStudents: any[] = [];
        if (
            params.students &&
            params.students.length > 0 &&
            params.students.length <= 5
        ) {
            const validStudents = await parentRepository.findStudentsByIds(
                params.students
            );
            if (validStudents.length > 0) {
                const studentIds = validStudents.map(s => s.id);
                await parentRepository.attachStudents(parentId, studentIds);
                attachedStudents = validStudents;

                // Sync posts (external dependency - will be handled by controller/wrapper)
            }
        }

        return {
            parent: {
                id: parentId,
                email: params.email,
                phone_number: params.phone_number,
                given_name: params.given_name,
                family_name: params.family_name,
                students: attachedStudents,
            },
        };
    }

    /**
     * Update parent data
     */
    async updateParent(
        params: UpdateParentRequest
    ): Promise<UpdateParentResponse> {
        // Find parent
        const parent = await parentRepository.findById(
            params.parentId,
            params.schoolId
        );

        if (!parent) {
            throw ApiError.notFound('parent_not_found');
        }

        // Check for duplicate email
        const duplicates = await parentRepository.findDuplicateByEmailOrPhone(
            null,
            params.phone_number
        );

        if (duplicates.length > 0) {
            const duplicate = duplicates[0];
            if (params.email && duplicate.id != parseInt(params.parentId)) {
                if (params.email === duplicate.email) {
                    throw ApiError.badRequest('email_already_exists');
                }
            }
        }

        // Update
        await parentRepository.update(parent.id, {
            email: params.email,
            given_name: params.given_name || '',
            family_name: params.family_name || '',
        });

        return {
            parent: {
                id: parent.id,
                email: params.email,
                phone_number: parent.phone_number,
                given_name: params.given_name,
                family_name: params.family_name,
            },
        };
    }

    /**
     * Delete parent
     */
    async deleteParent(
        params: DeleteParentRequest
    ): Promise<DeleteParentResponse> {
        // Find parent with cognito info
        const parent = await parentRepository.findForDelete(
            params.parentId,
            params.schoolId
        );

        if (!parent) {
            throw ApiError.notFound('parent_not_found');
        }

        // Delete from Cognito
        await this.cognitoClient.delete(`+${parent.phone_number}`);

        // Delete from database
        await parentRepository.delete(parent.id);

        return {
            message: 'parentDeleted',
        };
    }

    /**
     * Resend temporary password to parent
     */
    async resendPassword(
        params: ResendPasswordRequest
    ): Promise<ResendPasswordResponse> {
        // Find parent
        const parent = await parentRepository.findForResend(params.parentId);

        if (!parent) {
            throw ApiError.notFound('Parent not found');
        }

        // Format phone number
        const phoneNumber = parent.phone_number.startsWith('+')
            ? parent.phone_number
            : `+${parent.phone_number}`;

        // Resend via Cognito
        const result =
            await this.cognitoClient.resendTemporaryPassword(phoneNumber);

        // Format parent name
        const parentName =
            `${parent.given_name ?? ''} ${parent.family_name ?? ''}`.trim() ||
            parent.email ||
            parent.phone_number;

        return {
            message: result.message,
            parent_name: parentName,
            email: parent.email,
        };
    }

    /**
     * Bulk resend temporary passwords
     */
    async bulkResendPassword(
        params: BulkResendPasswordRequest
    ): Promise<BulkResendPasswordResponse> {
        // Find parents
        const parents = await parentRepository.findForBulkResend(
            params.parentIds
        );

        if (parents.length === 0) {
            throw ApiError.notFound('No parents found');
        }

        // Filter only parents who need password (haven't logged in)
        const parentsNeedingPassword = parents.filter(
            parent => !parent.last_login_at && !parent.arn
        );

        if (parentsNeedingPassword.length === 0) {
            return {
                message: 'All selected parents have already logged in',
                successful_count: 0,
                failed_count: 0,
                results: [],
            };
        }

        // Resend passwords in parallel
        const promises = parentsNeedingPassword.map(async parent => {
            try {
                const phoneNumber = parent.phone_number.startsWith('+')
                    ? parent.phone_number
                    : `+${parent.phone_number}`;

                const result =
                    await this.cognitoClient.resendTemporaryPassword(
                        phoneNumber
                    );

                return {
                    parent_id: parent.id,
                    success: true,
                    message: result.message,
                };
            } catch (e: any) {
                console.error('Error resending password for parent:', e);
                return {
                    parent_id: parent.id,
                    success: false,
                    message: e.message || 'Failed to resend password',
                };
            }
        });

        const settled = await Promise.allSettled(promises);
        const results = settled.map(result =>
            result.status === 'fulfilled'
                ? result.value
                : {
                      parent_id: 0,
                      success: false,
                      message: 'Promise failed to execute',
                  }
        );

        const successfulCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        return {
            message: `Bulk password resend completed. ${successfulCount} successful, ${failedCount} failed.`,
            successful_count: successfulCount,
            failed_count: failedCount,
            results,
        };
    }

    /**
     * Get parent with their students
     */
    async getParentStudents(
        params: GetParentStudentsRequest
    ): Promise<GetParentStudentsResponse> {
        const { parent, students } = await parentRepository.findWithStudents(
            params.parentId,
            params.schoolId
        );

        if (!parent) {
            throw ApiError.notFound('parent_not_found');
        }

        return {
            parent,
            students,
        };
    }

    /**
     * Get students for parent (secure version)
     */
    async getParentStudentsSecure(
        params: GetParentStudentsSecureRequest
    ): Promise<GetParentStudentsSecureResponse> {
        const students = await parentRepository.findStudentsForParent(
            params.parentId,
            params.schoolId
        );

        return {
            students,
        };
    }

    /**
     * Change parent's students
     */
    async changeParentStudents(
        params: ChangeParentStudentsRequest
    ): Promise<ChangeParentStudentsResponse> {
        // Validate max 5 students
        if (params.students.length >= 6) {
            throw ApiError.badRequest(
                'parent_cant_attach_more_than_5_students'
            );
        }

        // Verify parent exists
        const parent = await parentRepository.findById(
            params.parentId,
            params.schoolId
        );

        if (!parent) {
            throw ApiError.notFound('parent_not_found');
        }

        // Get existing students
        const existingStudentIds = await parentRepository.getExistingStudentIds(
            parent.id
        );

        // Calculate changes
        const newStudentIds = params.students.filter(
            id => !existingStudentIds.includes(id)
        );
        const removedStudentIds = existingStudentIds.filter(
            id => !params.students.includes(id)
        );

        // Remove students
        if (removedStudentIds.length > 0) {
            await parentRepository.removeStudents(parent.id, removedStudentIds);
        }

        // Add new students
        if (newStudentIds.length > 0) {
            await parentRepository.addStudents(parent.id, newStudentIds);
            // Note: syncronizePosts will be called in controller
        }

        return {
            message: 'Students changed successfully',
            newStudentIds, // Return for controller to sync posts
        };
    }

    /**
     * Export parents to CSV
     */
    async exportParentsToCSV(
        schoolId: string
    ): Promise<ExportParentsToCSVResult> {
        const parents = await parentRepository.findAllForExport(schoolId);

        if (!parents || parents.length === 0) {
            throw ApiError.notFound('No parents found');
        }

        const parentsWithStudents = await Promise.all(
            parents.map(async parent => {
                const student_numbers =
                    await parentRepository.findStudentNumbersByParentId(
                        parent.id
                    );
                return { ...parent, student_numbers };
            })
        );

        const csvData: any[] = [];
        for (const parent of parentsWithStudents as any[]) {
            const student_numbers = Array.isArray(parent.student_numbers)
                ? [...parent.student_numbers]
                : [];
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

        return {
            filename: 'parents.csv',
            contentType: 'text/csv; charset=utf-8',
            csvContent: '\uFEFF' + csvContent,
        };
    }

    /**
     * CSV template for parent import
     */
    getCSVTemplate(): ExportParentsToCSVResult {
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

        return {
            filename: 'parent_template.csv',
            contentType: 'text/csv; charset=utf-8',
            csvContent: '\uFEFF' + csvContent,
        };
    }

    /**
     * Upload parents from CSV (create/update/delete)
     */
    async uploadParentsFromCSV(params: {
        fileBuffer: Buffer;
        throwInError?: string;
        action: 'create' | 'update' | 'delete';
        withCSV?: string;
        schoolId: string;
    }): Promise<{ status: number; body: any }> {
        const throwErrors = params.throwInError === 'true';
        const withCSVBool = params.withCSV === 'true';

        const response = createBaseResponse<ParentCSVRow>();
        let connection: Connection | null = null;
        let createdCognitoUsers: string[] = [];

        try {
            const rawRows = await parseCSVBuffer(params.fileBuffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return { status: 200, body: response };
            }

            const seenEmails = new Set<string>();
            const seenPhones = new Set<string>();
            const valid: ParentCSVRow[] = [];
            const errors: ParentRowError[] = [];

            for (const row of rawRows) {
                const rawEmail = String((row as any).email || '').trim();
                const normalized: ParentCSVRow = {
                    email: rawEmail === '' ? null : rawEmail,
                    phone_number: String(
                        (row as any).phone_number || ''
                    ).trim(),
                    given_name: String((row as any).given_name || '').trim(),
                    family_name: String((row as any).family_name || '').trim(),
                    student_numbers: String((row as any).student_numbers || '')
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
                return { status: 400, body: response };
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
                    { emails, phones, sid: params.schoolId }
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
                    if (params.action === 'create') {
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
                                sid: params.schoolId,
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
                                const values = (studs as any[])
                                    .map((s: any) => `(${s.id}, ${parentId})`)
                                    .join(',');
                                await DB.executeWithConnection(
                                    connection,
                                    `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
                                );
                                for (const s of studs as any[]) {
                                    await syncronizePosts(parentId, s.id);
                                }
                            }
                        }
                        response.inserted.push(row);
                    } else if (params.action === 'update') {
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
                            (existingStuds as any[]).map(
                                (s: any) => s.student_number
                            )
                        );
                        const newTargets = row.student_numbers.filter(
                            s => !existingNums.has(s)
                        );
                        const toRemove = (existingStuds as any[]).filter(
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
                                const values = (studs as any[])
                                    .map((s: any) => `(${s.id}, ${pid})`)
                                    .join(',');
                                await DB.executeWithConnection(
                                    connection,
                                    `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`
                                );
                                for (const s of studs as any[]) {
                                    await syncronizePosts(
                                        pid as number,
                                        s.id as number
                                    );
                                }
                            }
                        }
                        response.updated.push(row);
                    } else if (params.action === 'delete') {
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
                            { id: pid, sid: params.schoolId }
                        );
                        response.deleted.push(row);
                    }
                } catch {
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

            return {
                status: response.errors.length ? 400 : 200,
                body: response,
            };
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

            return {
                status: 500,
                body: createErrorResponse(ErrorKeys.server_error, e.message),
            };
        }
    }

    /**
     * Upload parents from Kintone
     */
    async uploadParentsFromKintone(params: {
        schoolId: string;
        kintoneSubdomain: string;
        kintoneDomain: string;
        kintoneToken: string;
        given_name_field?: string;
        family_name_field?: string;
        email_field: string;
        phone_number_field: string;
        student_number_field: string;
    }): Promise<{ status: number; body: any }> {
        const {
            kintoneSubdomain,
            kintoneDomain,
            kintoneToken,
            given_name_field,
            family_name_field,
            email_field,
            phone_number_field,
            student_number_field,
        } = params;

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
                return {
                    status: 400,
                    body: { message: 'invalid_kintone_domain_provided' },
                };
            }

            if (
                !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$/i.test(kintoneSubdomain)
            ) {
                console.warn(
                    `SECURITY: Invalid subdomain format blocked: ${kintoneSubdomain}`
                );
                return {
                    status: 400,
                    body: { message: 'invalid_kintone_subdomain_provided' },
                };
            }

            const validatedUrl = `https://${kintoneSubdomain}.${selectedDomain}/k/v1/records.json`;

            if (
                typeof kintoneToken !== 'string' ||
                kintoneToken.length < 10 ||
                kintoneToken.length > 100
            ) {
                return {
                    status: 400,
                    body: { message: 'invalid_kintone_token_provided' },
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
                    return {
                        status: 500,
                        body: {
                            error: 'error_fetching_data_kintone',
                            message: responseData.message,
                        },
                    };
                }

                data = await response.json();
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    return {
                        status: 408,
                        body: { message: 'kintone_request_timeout' },
                    };
                }
                return {
                    status: 500,
                    body: { message: 'kintone_network_error' },
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
                            'invalid_student_number_format';
                    }
                }

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({
                        record,
                        errors: rowErrors,
                    });
                    continue;
                }

                // Find or create parent
                const existingParents = await DB.query(
                    `SELECT id, cognito_sub_id, phone_number, email
                     FROM Parent
                     WHERE (email = :email OR phone_number = :phone_number)
                     AND school_id = :school_id`,
                    {
                        email,
                        phone_number,
                        school_id: params.schoolId,
                    }
                );

                let parentId: number;
                if (existingParents.length > 0) {
                    parentId = (existingParents as any[])[0].id;
                    // Update existing parent names
                    await DB.execute(
                        `UPDATE Parent
                         SET given_name = :given_name, family_name = :family_name
                         WHERE id = :id`,
                        {
                            given_name: given_name || '',
                            family_name: family_name || '',
                            id: parentId,
                        }
                    );
                } else {
                    const phoneFormatted = `+${phone_number}`;
                    const cognitoParent = await this.cognitoClient.register(
                        phoneFormatted,
                        email,
                        phoneFormatted
                    );
                    const insert = await DB.execute(
                        `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
                         VALUES (:cid, :email, :phone, :given, :family, :sid)`,
                        {
                            cid: cognitoParent.sub_id,
                            email,
                            phone: phone_number,
                            given: given_name || '',
                            family: family_name || '',
                            sid: params.schoolId,
                        }
                    );
                    parentId = insert.insertId;
                }

                // Attach student to parent by student_number
                const existingStudent = await DB.query(
                    `SELECT id FROM Student WHERE student_number = :student_number`,
                    {
                        student_number,
                    }
                );

                if (!existingStudent || existingStudent.length === 0) {
                    errors.push({
                        record,
                        errors: {
                            student_number: 'student_not_found',
                        },
                    });
                    continue;
                }

                const existingStudentId = (existingStudent as any[])[0].id;

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

                await syncronizePosts(parentId, existingStudentId);
            }

            if (errors.length > 0) {
                return {
                    status: 400,
                    body: {
                        message:
                            'Kintone data uploaded successfully but with errors',
                        errors: errors,
                    },
                };
            }

            return {
                status: 200,
                body: {
                    message: 'Kintone data uploaded successfully',
                },
            };
        } catch (e: any) {
            console.error(e);
            return {
                status: 500,
                body: {
                    error: 'Internal server error',
                    details: e.message,
                },
            };
        }
    }
}

// Export factory function instead of singleton
export const createParentService = (cognitoClient: CognitoClient) => {
    return new ParentService(cognitoClient);
};
