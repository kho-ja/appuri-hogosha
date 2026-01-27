/**
 * Student Repository
 *
 * Data access layer for Student entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';

// ==================== Interfaces ====================

export interface StudentBasicInfo {
    id: number;
    given_name: string;
    family_name: string;
}

export interface StudentDetailInfo {
    id: number;
    email: string;
    given_name: string;
    family_name: string;
    phone_number: string;
    student_number: string;
    cohort: number | null;
}

export interface ParentInfo {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface GroupInfo {
    id: number;
    name: string;
}

export interface StudentListFilters {
    school_id: number;
    filterBy:
        | 'all'
        | 'student_number'
        | 'cohort'
        | 'email'
        | 'phone_number'
        | 'given_name'
        | 'family_name';
    filterValue?: string;
    limit: number;
    offset: number;
}

export interface CreateStudentData {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort: number | null;
    school_id: number;
}

export interface UpdateStudentData {
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort: number | null;
    id: number;
    school_id: number;
}

export interface DuplicateCheckResult {
    email?: string;
    phone_number?: string;
    student_number?: string;
}

// ==================== Repository Class ====================

export class StudentRepository {
    /**
     * Find students by ID array
     */
    async findByIds(
        studentIds: number[],
        schoolId: number
    ): Promise<StudentBasicInfo[]> {
        return await DB.query(
            `SELECT id, given_name, family_name
            FROM Student 
            WHERE id IN (:students) AND school_id = :school_id`,
            {
                students: studentIds,
                school_id: schoolId,
            }
        );
    }

    /**
     * Find students with pagination and filters
     */
    async findWithPagination(
        filters: StudentListFilters
    ): Promise<StudentDetailInfo[]> {
        const { school_id, filterBy, filterValue, limit, offset } = filters;

        const whereConditions: string[] = [];
        const params: any = {
            school_id,
            limit,
            offset,
        };

        if (filterValue && filterValue.trim() !== '') {
            if (filterBy === 'all') {
                whereConditions.push(
                    '(given_name LIKE :filterValue OR family_name LIKE :filterValue OR email LIKE :filterValue OR phone_number LIKE :filterValue OR student_number LIKE :filterValue OR CAST(cohort AS CHAR) LIKE :filterValue)'
                );
                params.filterValue = `%${filterValue}%`;
            } else if (filterBy === 'cohort') {
                const cohortValue = parseInt(filterValue);
                if (!isNaN(cohortValue)) {
                    whereConditions.push('cohort = :filterValue');
                    params.filterValue = cohortValue;
                }
            } else {
                whereConditions.push(`${filterBy} LIKE :filterValue`);
                params.filterValue = `%${filterValue}%`;
            }
        }

        const whereClause =
            whereConditions.length > 0
                ? 'AND ' + whereConditions.join(' AND ')
                : '';

        return await DB.query(
            `SELECT id, email, given_name, family_name, phone_number, student_number, cohort
            FROM Student
            WHERE school_id = :school_id ${whereClause}
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset`,
            params
        );
    }

    /**
     * Count students with filters
     */
    async countWithFilters(
        filters: Omit<StudentListFilters, 'limit' | 'offset'>
    ): Promise<number> {
        const { school_id, filterBy, filterValue } = filters;

        const whereConditions: string[] = [];
        const params: any = {
            school_id,
        };

        if (filterValue && filterValue.trim() !== '') {
            if (filterBy === 'all') {
                whereConditions.push(
                    '(given_name LIKE :filterValue OR family_name LIKE :filterValue OR email LIKE :filterValue OR phone_number LIKE :filterValue OR student_number LIKE :filterValue OR CAST(cohort AS CHAR) LIKE :filterValue)'
                );
                params.filterValue = `%${filterValue}%`;
            } else if (filterBy === 'cohort') {
                const cohortValue = parseInt(filterValue);
                if (!isNaN(cohortValue)) {
                    whereConditions.push('cohort = :filterValue');
                    params.filterValue = cohortValue;
                }
            } else {
                whereConditions.push(`${filterBy} LIKE :filterValue`);
                params.filterValue = `%${filterValue}%`;
            }
        }

        const whereClause =
            whereConditions.length > 0
                ? 'AND ' + whereConditions.join(' AND ')
                : '';

        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM Student 
            WHERE school_id = :school_id ${whereClause}`,
            params
        );

        return result[0].total;
    }

    /**
     * Find student by ID with school verification
     */
    async findById(
        id: number,
        schoolId: number
    ): Promise<StudentDetailInfo | null> {
        const result = await DB.query(
            `SELECT id, email, given_name, family_name, phone_number, student_number, cohort
            FROM Student
            WHERE id = :id AND school_id = :school_id`,
            {
                id,
                school_id: schoolId,
            }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find parents for a student
     */
    async findParentsByStudentId(studentId: number): Promise<ParentInfo[]> {
        return await DB.query(
            `SELECT 
                pa.id,
                pa.email,
                pa.phone_number,
                COALESCE(NULLIF(pa.given_name, ''), st.given_name) AS given_name,
                COALESCE(NULLIF(pa.family_name, ''), st.family_name) AS family_name
            FROM StudentParent AS sp
            INNER JOIN Parent AS pa ON sp.parent_id = pa.id
            INNER JOIN Student AS st ON sp.student_id = st.id
            WHERE sp.student_id = :student_id`,
            {
                student_id: studentId,
            }
        );
    }

    /**
     * Find groups for a student
     */
    async findGroupsByStudentId(
        studentId: number,
        schoolId: number
    ): Promise<GroupInfo[]> {
        return await DB.query(
            `SELECT sg.id, sg.name 
            FROM GroupMember AS gm
            INNER JOIN StudentGroup AS sg ON gm.group_id = sg.id
            WHERE student_id = :student_id AND sg.school_id = :school_id`,
            {
                student_id: studentId,
                school_id: schoolId,
            }
        );
    }

    /**
     * Check for duplicate email/phone/student_number
     */
    async findDuplicateByEmailOrPhoneOrNumber(
        email: string,
        phoneNumber: string,
        studentNumber: string,
        schoolId: number,
        excludeId?: number
    ): Promise<DuplicateCheckResult | null> {
        const params: any = {
            email,
            phone_number: phoneNumber,
            student_number: studentNumber,
            school_id: schoolId,
        };

        let query = `SELECT email, phone_number, student_number 
                    FROM Student 
                    WHERE school_id = :school_id 
                    AND (email = :email OR phone_number = :phone_number OR student_number = :student_number)`;

        if (excludeId !== undefined) {
            query += ' AND id != :exclude_id';
            params.exclude_id = excludeId;
        }

        const result = await DB.query(query, params);

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Create new student
     */
    async create(data: CreateStudentData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO Student(email, phone_number, given_name, family_name, student_number, cohort, school_id)
            VALUE (:email, :phone_number, :given_name, :family_name, :student_number, :cohort, :school_id)`,
            data
        );

        return result.insertId;
    }

    /**
     * Update existing student
     */
    async update(data: UpdateStudentData): Promise<void> {
        await DB.execute(
            `UPDATE Student SET
                student_number = :student_number,
                phone_number = :phone_number,
                family_name = :family_name,
                given_name = :given_name,
                cohort = :cohort
            WHERE id = :id AND school_id = :school_id`,
            data
        );
    }

    /**
     * Delete student and related records
     */
    async delete(id: number, schoolId: number): Promise<void> {
        // Delete group memberships
        await DB.execute('DELETE FROM GroupMember WHERE student_id = :id', {
            id,
        });

        // Delete parent relationships
        await DB.execute('DELETE FROM StudentParent WHERE student_id = :id', {
            id,
        });

        // Delete post relationships
        await DB.execute('DELETE FROM PostStudent WHERE student_id = :id', {
            id,
        });

        // Delete student
        await DB.execute(
            'DELETE FROM Student WHERE id = :id AND school_id = :school_id',
            {
                id,
                school_id: schoolId,
            }
        );
    }

    /**
     * Find parents by IDs and check if they can accept more students
     */
    async findAvailableParents(parentIds: number[]): Promise<number[]> {
        const result = await DB.query(
            `SELECT pa.id
            FROM Parent AS pa
            LEFT JOIN StudentParent AS sp on pa.id = sp.parent_id
            WHERE pa.id IN (:parents)
            GROUP BY pa.id
            HAVING COUNT(sp.student_id) < 5`,
            {
                parents: parentIds,
            }
        );

        return result.map((row: any) => row.id);
    }

    /**
     * Attach parents to student
     */
    async attachParents(studentId: number, parentIds: number[]): Promise<void> {
        if (parentIds.length === 0) return;

        const values = parentIds
            .map(parentId => `(${parentId}, ${studentId})`)
            .join(', ');

        await DB.execute(
            `INSERT INTO StudentParent (parent_id, student_id) VALUES ${values}`
        );
    }

    /**
     * Get current parent IDs for a student
     */
    async getExistingParentIds(studentId: number): Promise<number[]> {
        const result = await DB.query(
            `SELECT parent_id FROM StudentParent WHERE student_id = :student_id`,
            {
                student_id: studentId,
            }
        );

        return result.map((row: any) => row.parent_id);
    }

    /**
     * Remove parents from student
     */
    async removeParents(studentId: number, parentIds: number[]): Promise<void> {
        if (parentIds.length === 0) return;

        // Remove StudentParent relationships
        await DB.query(
            `DELETE FROM StudentParent
            WHERE student_id = :student_id AND parent_id IN (:parentIds)`,
            {
                student_id: studentId,
                parentIds,
            }
        );

        // Remove PostParent relationships
        await DB.query(
            `DELETE pp
            FROM PostParent AS pp
            INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
            WHERE ps.student_id = :student_id AND pp.parent_id IN (:parentIds)`,
            {
                student_id: studentId,
                parentIds,
            }
        );
    }

    /**
     * Add parents to student
     */
    async addParents(studentId: number, parentIds: number[]): Promise<void> {
        if (parentIds.length === 0) return;

        const insertData = parentIds.map(parentId => ({
            student_id: studentId,
            parent_id: parentId,
        }));

        const valuesString = insertData
            .map(item => `(${item.student_id}, ${item.parent_id})`)
            .join(', ');

        await DB.query(
            `INSERT INTO StudentParent (student_id, parent_id) VALUES ${valuesString}`
        );
    }

    /**
     * Check if parents exceed student limit
     */
    async findParentsAtLimit(parentIds: number[]): Promise<
        Array<{
            id: number;
            given_name: string;
            family_name: string;
            email: string;
        }>
    > {
        const parentLimitCheck = await DB.query(
            `SELECT pa.id, COUNT(sp.student_id) as student_count
            FROM Parent AS pa
            LEFT JOIN StudentParent AS sp on pa.id = sp.parent_id
            WHERE pa.id IN (:parents)
            GROUP BY pa.id`,
            {
                parents: parentIds,
            }
        );

        const parentsAtLimit = parentLimitCheck
            .filter((item: any) => item.student_count >= 5)
            .map((item: any) => item.id);

        if (parentsAtLimit.length === 0) {
            return [];
        }

        return await DB.query(
            `SELECT id, given_name, family_name, email
            FROM Parent
            WHERE id IN (:parentIds)`,
            {
                parentIds: parentsAtLimit,
            }
        );
    }
}

export const studentRepository = new StudentRepository();
