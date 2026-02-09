/**
 * Student Service
 *
 * Business logic layer for Student operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { studentRepository } from './student.repository';
import { ApiError } from '../../errors/ApiError';
import { generatePaginationLinks } from '../../utils/helper';
import { ErrorKeys } from '../../utils/error-codes';
import process from 'node:process';
import type {
    GetStudentsByIdsResponse,
    GetStudentListRequest,
    GetStudentListResponse,
    GetStudentDetailResponse,
    CreateStudentRequest,
    CreateStudentResponse,
    UpdateStudentRequest,
    UpdateStudentResponse,
    DeleteStudentResponse,
    GetStudentParentsResponse,
    ChangeStudentParentsRequest,
    ChangeStudentParentsResponse,
} from './types/student.dto';

export class StudentService {
    /**
     * Get students by ID array
     */
    async getStudentsByIds(
        studentIds: number[],
        schoolId: number
    ): Promise<GetStudentsByIdsResponse> {
        const studentList = await studentRepository.findByIds(
            studentIds,
            schoolId
        );

        return {
            studentList,
        };
    }

    /**
     * Get student list with pagination and filters
     */
    async getStudentList(
        request: GetStudentListRequest,
        schoolId: number
    ): Promise<GetStudentListResponse> {
        const page = request.page || 1;
        const limit = parseInt(process.env.PER_PAGE || '10');
        const offset = (page - 1) * limit;

        const filterBy = request.filterBy || 'all';
        const filterValue = request.filterValue || '';

        // Fetch students
        const students = await studentRepository.findWithPagination({
            school_id: schoolId,
            filterBy,
            filterValue,
            limit,
            offset,
        });

        // Count total
        const totalStudents = await studentRepository.countWithFilters({
            school_id: schoolId,
            filterBy,
            filterValue,
        });

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

        return {
            students,
            pagination,
        };
    }

    /**
     * Get student detail with parents and groups
     */
    async getStudentDetail(
        studentId: number,
        schoolId: number
    ): Promise<GetStudentDetailResponse> {
        // Fetch student
        const student = await studentRepository.findById(studentId, schoolId);

        if (!student) {
            throw new ApiError(404, 'student_not_found');
        }

        // Fetch parents and groups in parallel
        const [parents, groups] = await Promise.all([
            studentRepository.findParentsByStudentId(studentId),
            studentRepository.findGroupsByStudentId(studentId, schoolId),
        ]);

        return {
            student,
            parents,
            groups,
        };
    }

    /**
     * Create new student
     */
    async createStudent(
        request: CreateStudentRequest,
        schoolId: number
    ): Promise<CreateStudentResponse> {
        const {
            email,
            phone_number,
            given_name,
            family_name,
            student_number,
            cohort,
            parents,
        } = request;

        // Validate parent limit
        if (parents && Array.isArray(parents) && parents.length > 5) {
            throw new ApiError(400, 'maximum_5_parents_allowed');
        }

        // Check for duplicates
        const duplicate =
            await studentRepository.findDuplicateByEmailOrPhoneOrNumber(
                email,
                phone_number,
                student_number,
                schoolId
            );

        if (duplicate) {
            if (email === duplicate.email) {
                throw new ApiError(400, 'email_already_exists');
            }
            if (phone_number === duplicate.phone_number) {
                throw new ApiError(400, 'phone_number_already_exists');
            }
            if (student_number === duplicate.student_number) {
                throw new ApiError(400, 'student_number_already_exists');
            }
        }

        // Create student
        const studentId = await studentRepository.create({
            email,
            phone_number,
            given_name,
            family_name,
            student_number,
            cohort: cohort || null,
            school_id: schoolId,
        });

        // Attach parents
        const attachedParents: any[] = [];
        if (parents && Array.isArray(parents) && parents.length > 0) {
            const availableParents =
                await studentRepository.findAvailableParents(parents);

            if (availableParents.length > 0) {
                await studentRepository.attachParents(
                    studentId,
                    availableParents
                );

                // Get attached parent details
                const parentList =
                    await studentRepository.findParentsByStudentId(studentId);
                attachedParents.push(...parentList);
            }
        }

        return {
            student: {
                id: studentId,
                email,
                phone_number,
                given_name,
                family_name,
                student_number,
                parents: attachedParents,
            },
        };
    }

    /**
     * Update existing student
     */
    async updateStudent(
        request: UpdateStudentRequest,
        schoolId: number
    ): Promise<UpdateStudentResponse> {
        const studentId = parseInt(request.id);
        const {
            phone_number,
            given_name,
            family_name,
            student_number,
            cohort,
        } = request;

        // Find student
        const student = await studentRepository.findById(studentId, schoolId);

        if (!student) {
            throw new ApiError(404, 'student_not_found');
        }

        // Check for phone duplicate (excluding current student)
        const duplicate =
            await studentRepository.findDuplicateByEmailOrPhoneOrNumber(
                student.email, // Keep same email
                phone_number,
                student_number,
                schoolId,
                studentId
            );

        if (duplicate && phone_number === duplicate.phone_number) {
            throw new ApiError(400, 'phone_number_already_exists');
        }

        // Update student
        await studentRepository.update({
            phone_number,
            given_name,
            family_name,
            student_number,
            cohort: cohort || null,
            id: studentId,
            school_id: schoolId,
        });

        return {
            student: {
                id: studentId,
                email: student.email,
                phone_number,
                given_name,
                family_name,
                student_number,
                cohort: cohort || null,
            },
        };
    }

    /**
     * Delete student
     */
    async deleteStudent(
        studentId: number,
        schoolId: number
    ): Promise<DeleteStudentResponse> {
        // Verify student exists
        const student = await studentRepository.findById(studentId, schoolId);

        if (!student) {
            throw new ApiError(404, 'student_not_found');
        }

        // Delete student and all relationships
        await studentRepository.delete(studentId, schoolId);

        return {
            message: 'student_deleted',
        };
    }

    /**
     * Get student parents
     */
    async getStudentParents(
        studentId: number,
        schoolId: number
    ): Promise<GetStudentParentsResponse> {
        // Find student (limited fields)
        const student = await studentRepository.findById(studentId, schoolId);

        if (!student) {
            throw new ApiError(404, 'student_not_found');
        }

        // Get parents
        const parents =
            await studentRepository.findParentsByStudentId(studentId);

        return {
            student,
            parents,
        };
    }

    /**
     * Change student parents
     * Returns new parent IDs for post synchronization
     */
    async changeStudentParents(
        request: ChangeStudentParentsRequest,
        schoolId: number
    ): Promise<{
        response: ChangeStudentParentsResponse;
        newParentIds: number[];
    }> {
        const studentId = parseInt(request.id);
        const { parents } = request;

        // Validate parent limit
        if (parents.length > 5) {
            throw new ApiError(400, 'maximum_5_parents_allowed');
        }

        // Verify student exists
        const student = await studentRepository.findById(studentId, schoolId);

        if (!student) {
            throw new ApiError(404, 'student_not_found');
        }

        // Get existing parent IDs
        const existingParentIds =
            await studentRepository.getExistingParentIds(studentId);

        // Calculate new and removed parents
        const newParentIds = parents.filter(
            id => !existingParentIds.includes(id)
        );
        const removedParentIds = existingParentIds.filter(
            id => !parents.includes(id)
        );

        // Remove old parents
        if (removedParentIds.length > 0) {
            await studentRepository.removeParents(studentId, removedParentIds);
        }

        // Add new parents
        if (newParentIds.length > 0) {
            // Check if any parents are at limit
            const parentsAtLimit =
                await studentRepository.findParentsAtLimit(newParentIds);

            if (parentsAtLimit.length > 0) {
                throw new ApiError(
                    400,
                    ErrorKeys.parent_student_limit_exceeded,
                    undefined,
                    true,
                    {
                        parentsAtLimit: parentsAtLimit.map(p => ({
                            id: p.id,
                            name: `${p.given_name} ${p.family_name}`,
                            email: p.email,
                        })),
                    }
                );
            }

            await studentRepository.addParents(studentId, newParentIds);
        }

        return {
            response: {
                message: 'parents_changed_successfully',
            },
            newParentIds, // Return for post synchronization in controller
        };
    }
}

export const studentService = new StudentService();
