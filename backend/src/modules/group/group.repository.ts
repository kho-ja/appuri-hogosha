/**
 * Group Repository
 *
 * Data access layer for StudentGroup entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';

// ==================== Interfaces ====================

export interface GroupBasicInfo {
    id: number;
    name: string;
}

export interface GroupDetailInfo {
    id: number;
    name: string;
    created_at: Date;
    sub_group_id: number | null;
    sub_group_name: string | null;
}

export interface StudentMember {
    id: number;
    email: string;
    phone_number: string;
    student_number: string;
    given_name: string;
    family_name: string;
    cohort: number | null;
}

export interface SubGroupInfo {
    id: number;
    name: string;
    created_at: Date;
    member_count: number;
}

export interface GroupListFilters {
    school_id: number;
    limit: number;
    offset: number;
}

export interface MemberListFilters {
    group_id: number;
    email?: string;
    student_number?: string;
    limit?: number;
    offset?: number;
}

export interface CreateGroupData {
    name: string;
    school_id: number;
    sub_group_id: number | null;
}

export interface UpdateGroupData {
    id: number;
    name: string;
    sub_group_id: number | null;
}

// ==================== Repository Class ====================

export class GroupRepository {
    /**
     * Find groups by ID array
     */
    async findByIds(
        groupIds: number[],
        schoolId: number
    ): Promise<GroupBasicInfo[]> {
        return await DB.query(
            `SELECT id, name 
            FROM StudentGroup
            WHERE id IN (:groups) AND school_id = :school_id`,
            {
                groups: groupIds,
                school_id: schoolId,
            }
        );
    }

    /**
     * Find groups with pagination (includes subgroup info)
     */
    async findWithPagination(
        filters: GroupListFilters & { all?: boolean; name?: string }
    ): Promise<GroupDetailInfo[]> {
        const { school_id, limit, offset, all, name } = filters;

        const whereClauses = ['sg.school_id = :school_id'];
        const params: any = { school_id };

        if (name) {
            whereClauses.push('sg.name LIKE :name');
            params.name = `%${name}%`;
        }

        if (!all) {
            params.limit = limit;
            params.offset = offset;
        }

        const limitClause = all ? '' : 'LIMIT :limit OFFSET :offset';
        const whereClause = whereClauses.join(' AND ');

        return await DB.query(
            `SELECT 
                sg.id,
                sg.name,
                sg.created_at,
                sg.sub_group_id,
                parent.name as sub_group_name
            FROM StudentGroup sg
            LEFT JOIN StudentGroup parent ON sg.sub_group_id = parent.id
            WHERE ${whereClause}
            ORDER BY sg.id DESC
            ${limitClause}`,
            params
        );
    }

    /**
     * Count total groups
     */
    async countGroups(schoolId: number): Promise<number> {
        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM StudentGroup
            WHERE school_id = :school_id`,
            {
                school_id: schoolId,
            }
        );

        return result[0].total;
    }

    /**
     * Find group by ID with school verification
     */
    async findById(
        id: number,
        schoolId: number
    ): Promise<GroupDetailInfo | null> {
        const result = await DB.query(
            `SELECT 
                sg.id,
                sg.name,
                sg.created_at,
                sg.sub_group_id,
                parent_sg.name as sub_group_name
            FROM StudentGroup sg
            LEFT JOIN StudentGroup parent_sg ON sg.sub_group_id = parent_sg.id
            WHERE sg.id = :id AND sg.school_id = :school_id`,
            {
                id,
                school_id: schoolId,
            }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find members with filters and pagination
     */
    async findMembersWithFilters(
        filters: MemberListFilters
    ): Promise<StudentMember[]> {
        const { group_id, email, student_number, limit, offset } = filters;

        const whereConditions: string[] = [];
        const params: any = {
            group_id,
        };

        if (email) {
            whereConditions.push('st.email LIKE :email');
            params.email = `%${email}%`;
        }
        if (student_number) {
            whereConditions.push('st.student_number LIKE :student_number');
            params.student_number = `%${student_number}%`;
        }

        const whereClause =
            whereConditions.length > 0
                ? 'AND ' + whereConditions.join(' AND ')
                : '';

        let query = `SELECT 
            st.id, st.phone_number, st.email,
            st.student_number, st.given_name, st.family_name, st.cohort
        FROM GroupMember AS gm
        INNER JOIN Student AS st ON gm.student_id = st.id
        WHERE gm.group_id = :group_id ${whereClause}
        ORDER BY gm.id DESC`;

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT :limit OFFSET :offset';
            params.limit = limit;
            params.offset = offset;
        }

        return await DB.query(query, params);
    }

    /**
     * Count members with filters
     */
    async countMembersWithFilters(
        filters: Omit<MemberListFilters, 'limit' | 'offset'>
    ): Promise<number> {
        const { group_id, email, student_number } = filters;

        const whereConditions: string[] = [];
        const params: any = {
            group_id,
        };

        if (email) {
            whereConditions.push('st.email LIKE :email');
            params.email = `%${email}%`;
        }
        if (student_number) {
            whereConditions.push('st.student_number LIKE :student_number');
            params.student_number = `%${student_number}%`;
        }

        const whereClause =
            whereConditions.length > 0
                ? 'AND ' + whereConditions.join(' AND ')
                : '';

        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM GroupMember as gm
            INNER JOIN Student AS st ON gm.student_id = st.id
            WHERE gm.group_id = :group_id ${whereClause}`,
            params
        );

        return result[0].total;
    }

    /**
     * Check if group name already exists
     */
    async findByName(
        name: string,
        schoolId: number,
        excludeId?: number
    ): Promise<GroupBasicInfo | null> {
        let query = `SELECT id, name FROM StudentGroup WHERE name = :name AND school_id = :school_id`;
        const params: any = {
            name,
            school_id: schoolId,
        };

        if (excludeId !== undefined) {
            query += ' AND id != :exclude_id';
            params.exclude_id = excludeId;
        }

        const result = await DB.query(query, params);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Verify sub group exists
     */
    async subGroupExists(id: number, schoolId: number): Promise<boolean> {
        const result = await DB.query(
            `SELECT id FROM StudentGroup WHERE id = :id AND school_id = :school_id`,
            {
                id,
                school_id: schoolId,
            }
        );

        return result.length > 0;
    }

    /**
     * Create new group
     */
    async create(data: CreateGroupData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO StudentGroup(name, created_at, school_id, sub_group_id)
            VALUE (:name, NOW(), :school_id, :sub_group_id)`,
            data
        );

        return result.insertId;
    }

    /**
     * Update existing group
     */
    async update(data: UpdateGroupData): Promise<void> {
        await DB.execute(
            `UPDATE StudentGroup 
            SET name = :name, sub_group_id = :sub_group_id 
            WHERE id = :id`,
            data
        );
    }

    /**
     * Delete group and related records
     */
    async delete(id: number, schoolId: number): Promise<void> {
        // Delete group members
        await DB.execute('DELETE FROM GroupMember WHERE group_id = :id', {
            id,
        });

        // Delete post-student relationships
        await DB.execute('DELETE FROM PostStudent WHERE group_id = :id', {
            id,
        });

        // Delete group
        await DB.execute(
            'DELETE FROM StudentGroup WHERE id = :id AND school_id = :school_id',
            {
                id,
                school_id: schoolId,
            }
        );
    }

    /**
     * Verify students exist
     */
    async findStudentsByIds(
        studentIds: number[],
        schoolId: number
    ): Promise<number[]> {
        const result = await DB.query(
            'SELECT id FROM Student WHERE id IN (:students) AND school_id = :school_id',
            {
                students: studentIds,
                school_id: schoolId,
            }
        );

        return result.map((row: any) => row.id);
    }

    /**
     * Attach students to group
     */
    async attachStudents(groupId: number, studentIds: number[]): Promise<void> {
        if (studentIds.length === 0) return;

        for (const studentId of studentIds) {
            await DB.execute(
                `INSERT INTO GroupMember (student_id, group_id) VALUES (:student_id, :group_id)`,
                { student_id: studentId, group_id: groupId }
            );
        }
    }

    /**
     * Get current member IDs for a group
     */
    async getExistingMemberIds(groupId: number): Promise<number[]> {
        const result = await DB.query(
            `SELECT student_id FROM GroupMember WHERE group_id = :group_id`,
            {
                group_id: groupId,
            }
        );

        return result.map((row: any) => row.student_id);
    }

    /**
     * Remove students from group
     */
    async removeStudents(groupId: number, studentIds: number[]): Promise<void> {
        if (studentIds.length === 0) return;

        await DB.query(
            `DELETE FROM GroupMember
            WHERE group_id = :group_id AND student_id IN (:studentIds)`,
            {
                group_id: groupId,
                studentIds,
            }
        );

        await DB.query(
            `DELETE FROM PostStudent AS ps
            WHERE ps.student_id IN (:studentIds) AND ps.group_id = :group_id`,
            {
                group_id: groupId,
                studentIds,
            }
        );
    }

    /**
     * Add students to group
     */
    async addStudents(groupId: number, studentIds: number[]): Promise<void> {
        if (studentIds.length === 0) return;

        for (const studentId of studentIds) {
            await DB.execute(
                `INSERT INTO GroupMember (student_id, group_id) VALUES (:student_id, :group_id)`,
                { student_id: studentId, group_id: groupId }
            );
        }
    }

    /**
     * Get sub-groups for a parent group
     */
    async findSubGroups(
        groupId: number,
        schoolId: number
    ): Promise<SubGroupInfo[]> {
        return await DB.query(
            `SELECT 
                sg.id,
                sg.name,
                sg.created_at,
                (SELECT COUNT(*) FROM GroupMember WHERE group_id = sg.id) as member_count
            FROM StudentGroup sg
            WHERE sg.sub_group_id = :group_id AND sg.school_id = :school_id
            ORDER BY sg.name`,
            {
                group_id: groupId,
                school_id: schoolId,
            }
        );
    }
}

export const groupRepository = new GroupRepository();
