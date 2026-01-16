// Parent Service: Business logic layer

import { parentRepository } from './parent.repository';
import { ApiError } from '../../errors/ApiError';
import { config } from '../../config';
import { generatePaginationLinks } from '../../utils/helper';
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
                params.email === duplicate.email &&
                params.phone_number === duplicate.phone_number
            ) {
                throw ApiError.badRequest(
                    'email_and_phone_number_already_exist'
                );
            }
            if (params.phone_number === duplicate.phone_number) {
                throw ApiError.badRequest('phone_number_already_exists');
            } else {
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
}

// Export factory function instead of singleton
export const createParentService = (cognitoClient: CognitoClient) => {
    return new ParentService(cognitoClient);
};
