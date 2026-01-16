/**
 * Group Service
 *
 * Business logic layer for Group operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { groupRepository } from './group.repository';
import { ApiError } from '../../errors/ApiError';
import { generatePaginationLinks } from '../../utils/helper';
import process from 'node:process';
import type {
    GetGroupsByIdsResponse,
    GetGroupListRequest,
    GetGroupListResponse,
    GetGroupDetailRequest,
    GetGroupDetailResponse,
    CreateGroupRequest,
    CreateGroupResponse,
    UpdateGroupRequest,
    UpdateGroupResponse,
    DeleteGroupResponse,
    GetSubGroupsResponse,
} from './types/group.dto';

export class GroupService {
    /**
     * Get groups by ID array
     */
    async getGroupsByIds(
        groupIds: number[],
        schoolId: number
    ): Promise<GetGroupsByIdsResponse> {
        const groupList = await groupRepository.findByIds(groupIds, schoolId);

        return {
            groupList,
        };
    }

    /**
     * Get group list with pagination
     */
    async getGroupList(
        request: GetGroupListRequest,
        schoolId: number
    ): Promise<GetGroupListResponse> {
        const page = request.page || 1;
        const limit = parseInt(process.env.PER_PAGE || '10');
        const offset = (page - 1) * limit;
        const all = request.all || false;
        const name = request.name;

        // Fetch groups
        const groups = await groupRepository.findWithPagination({
            school_id: schoolId,
            limit,
            offset,
            all,
            name,
        });

        // Count total
        const totalGroups = await groupRepository.countGroups(schoolId);
        const totalPages = Math.ceil(totalGroups / limit);

        const pagination = {
            current_page: page,
            per_page: limit,
            total_pages: totalPages,
            total_members: totalGroups,
            next_page: page < totalPages ? page + 1 : null,
            prev_page: page > 1 ? page - 1 : null,
            links: generatePaginationLinks(page, totalPages),
        };

        return {
            groups,
            pagination,
        };
    }

    /**
     * Get group detail with members
     */
    async getGroupDetail(
        request: GetGroupDetailRequest,
        schoolId: number
    ): Promise<GetGroupDetailResponse> {
        const groupId = parseInt(request.id);

        // Fetch group
        const group = await groupRepository.findById(groupId, schoolId);

        if (!group) {
            throw new ApiError(404, 'group_not_found');
        }

        const page = request.page || 1;
        const limit = parseInt(process.env.PER_PAGE || '10');
        const offset = (page - 1) * limit;

        const email = request.email || '';
        const student_number = request.student_number || '';

        // Fetch members (with or without pagination based on context)
        const isPaginated = request.context === 'view';
        const members = await groupRepository.findMembersWithFilters({
            group_id: groupId,
            email,
            student_number,
            limit: isPaginated ? limit : undefined,
            offset: isPaginated ? offset : undefined,
        });

        // Count members
        const totalMembers = await groupRepository.countMembersWithFilters({
            group_id: groupId,
            email,
            student_number,
        });

        const totalPages = Math.ceil(totalMembers / limit);

        const pagination = {
            current_page: page,
            per_page: limit,
            total_pages: totalPages,
            total_members: totalMembers,
            next_page: page < totalPages ? page + 1 : null,
            prev_page: page > 1 ? page - 1 : null,
            links: generatePaginationLinks(page, totalPages),
        };

        return {
            group,
            members,
            pagination,
        };
    }

    /**
     * Create new group
     */
    async createGroup(
        request: CreateGroupRequest,
        schoolId: number
    ): Promise<CreateGroupResponse> {
        const { name, sub_group_id, students } = request;

        // Validate sub_group_id if provided
        if (sub_group_id) {
            const subGroupExists = await groupRepository.subGroupExists(
                sub_group_id,
                schoolId
            );
            if (!subGroupExists) {
                throw new ApiError(404, 'sub_group_not_found');
            }
        }

        // Check for duplicate name
        const duplicate = await groupRepository.findByName(name, schoolId);
        if (duplicate) {
            throw new ApiError(400, 'group_name_already_exists');
        }

        // Create group
        const groupId = await groupRepository.create({
            name,
            school_id: schoolId,
            sub_group_id: sub_group_id || null,
        });

        // Attach students
        const attachedMembers: any[] = [];
        if (students && students.length > 0) {
            const validStudentIds = await groupRepository.findStudentsByIds(
                students,
                schoolId
            );

            if (validStudentIds.length > 0) {
                await groupRepository.attachStudents(groupId, validStudentIds);

                // Get member details
                const memberList = await groupRepository.findMembersWithFilters(
                    {
                        group_id: groupId,
                    }
                );

                attachedMembers.push(...memberList);
            }
        }

        return {
            group: {
                id: groupId,
                name,
                sub_group_id: sub_group_id || null,
                members: attachedMembers,
            },
        };
    }

    /**
     * Update existing group
     */
    async updateGroup(
        request: UpdateGroupRequest,
        schoolId: number
    ): Promise<UpdateGroupResponse> {
        const groupId = parseInt(request.id);
        const { name, sub_group_id, students } = request;

        // Find group
        const group = await groupRepository.findById(groupId, schoolId);

        if (!group) {
            throw new ApiError(404, 'group_not_found');
        }

        const finalSubGroupId =
            sub_group_id !== undefined ? sub_group_id : group.sub_group_id;

        // Validate sub_group_id if provided
        if (finalSubGroupId !== null && finalSubGroupId !== undefined) {
            const subGroupExists = await groupRepository.subGroupExists(
                finalSubGroupId,
                schoolId
            );
            if (!subGroupExists) {
                throw new ApiError(404, 'sub_group_not_found');
            }

            // Prevent self-reference
            if (finalSubGroupId === groupId) {
                throw new ApiError(400, 'cannot_reference_self_as_sub_group');
            }
        }

        // Update group
        await groupRepository.update({
            id: groupId,
            name,
            sub_group_id: finalSubGroupId,
        });

        // Update students if provided
        if (students && Array.isArray(students)) {
            const existingMemberIds =
                await groupRepository.getExistingMemberIds(groupId);

            const insertStudentIds = students.filter(
                id => !existingMemberIds.includes(id)
            );
            const deleteStudentIds = existingMemberIds.filter(
                id => !students.includes(id)
            );

            if (deleteStudentIds.length > 0) {
                await groupRepository.removeStudents(groupId, deleteStudentIds);
            }

            if (insertStudentIds.length > 0) {
                await groupRepository.addStudents(groupId, insertStudentIds);
            }
        }

        return {
            message: 'group_changed_successfully',
        };
    }

    /**
     * Delete group
     */
    async deleteGroup(
        groupId: number,
        schoolId: number
    ): Promise<DeleteGroupResponse> {
        // Verify group exists
        const group = await groupRepository.findById(groupId, schoolId);

        if (!group) {
            throw new ApiError(404, 'group_not_found');
        }

        // Delete group and all relationships
        await groupRepository.delete(groupId, schoolId);

        return {
            message: 'group_deleted',
        };
    }

    /**
     * Get sub-groups
     */
    async getSubGroups(
        groupId: number,
        schoolId: number
    ): Promise<GetSubGroupsResponse> {
        // Verify group exists
        const groupExists = await groupRepository.subGroupExists(
            groupId,
            schoolId
        );

        if (!groupExists) {
            throw new ApiError(404, 'group_not_found');
        }

        // Get sub-groups
        const subGroups = await groupRepository.findSubGroups(
            groupId,
            schoolId
        );

        return {
            sub_groups: subGroups,
        };
    }
}

export const groupService = new GroupService();
