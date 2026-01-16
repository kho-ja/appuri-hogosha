// Parent Repository: SQL queries only
// No business logic, just database access

import DB from '../../utils/db-client';

export interface ParentBasicInfo {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface ParentListRow extends ParentBasicInfo {
    last_login_at: string | null;
    arn: string | null;
}

export interface ParentDetailRow extends ParentListRow {
    created_at: string;
}

export interface StudentBasicInfo {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
}

export interface ParentListFilters {
    email?: string;
    phone_number?: string;
    name?: string;
    showOnlyNonLoggedIn?: boolean;
}

export interface ParentForDelete {
    id: number;
    cognito_sub_id: string;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    created_at: string;
    last_login_at: string | null;
}

export interface CreateParentData {
    cognito_sub_id: string;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    school_id: string;
}

export interface UpdateParentData {
    email: string | null;
    given_name: string;
    family_name: string;
}

export interface ParentForResend {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface ParentForBulkResend extends ParentForResend {
    last_login_at: string | null;
    arn: string | null;
}

export interface ParentWithStudentsInfo {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    created_at: string;
}

export interface StudentForParent {
    id: number;
    given_name: string;
    family_name: string;
}

class ParentRepository {
    /**
     * Find parents by IDs and school ID
     */
    async findByIds(
        parentIds: number[],
        schoolId: string
    ): Promise<ParentBasicInfo[]> {
        return await DB.query(
            `SELECT 
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name
            FROM Parent p
            WHERE p.id IN (:parents) AND p.school_id = :school_id`,
            {
                parents: parentIds,
                school_id: schoolId,
            }
        );
    }

    /**
     * Find parents with pagination and filters
     */
    async findWithPagination(
        schoolId: string,
        limit: number,
        offset: number,
        filters: ParentListFilters = {}
    ): Promise<ParentListRow[]> {
        const whereClauses: string[] = ['p.school_id = :school_id'];
        const params: any = {
            school_id: schoolId,
            limit,
            offset,
        };

        if (filters.email) {
            whereClauses.push('email LIKE :email');
            params.email = `%${filters.email}%`;
        }

        if (filters.phone_number) {
            whereClauses.push('phone_number LIKE :phone_number');
            params.phone_number = `%${filters.phone_number}%`;
        }

        if (filters.name) {
            whereClauses.push(
                '((p.given_name LIKE :name OR p.family_name LIKE :name OR p.phone_number LIKE :name OR p.email LIKE :name) OR EXISTS (SELECT 1 FROM StudentParent sp INNER JOIN Student st ON st.id = sp.student_id WHERE sp.parent_id = p.id AND (st.given_name LIKE :name OR st.family_name LIKE :name OR st.student_number LIKE :name)))'
            );
            params.name = `%${filters.name}%`;
        }

        if (filters.showOnlyNonLoggedIn) {
            whereClauses.push(
                'p.last_login_at IS NULL AND (p.arn IS NULL OR p.arn = "")'
            );
        }

        const whereClause = whereClauses.join(' AND ');

        return await DB.query(
            `SELECT
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name,
                p.last_login_at,
                p.arn
            FROM Parent p
            WHERE ${whereClause}
            ORDER BY p.id DESC
            LIMIT :limit OFFSET :offset`,
            params
        );
    }

    /**
     * Count parents with filters
     */
    async countWithFilters(
        schoolId: string,
        filters: ParentListFilters = {}
    ): Promise<number> {
        const whereClauses: string[] = ['p.school_id = :school_id'];
        const params: any = {
            school_id: schoolId,
        };

        if (filters.email) {
            whereClauses.push('email LIKE :email');
            params.email = `%${filters.email}%`;
        }

        if (filters.phone_number) {
            whereClauses.push('phone_number LIKE :phone_number');
            params.phone_number = `%${filters.phone_number}%`;
        }

        if (filters.name) {
            whereClauses.push(
                '((p.given_name LIKE :name OR p.family_name LIKE :name OR p.phone_number LIKE :name OR p.email LIKE :name) OR EXISTS (SELECT 1 FROM StudentParent sp INNER JOIN Student st ON st.id = sp.student_id WHERE sp.parent_id = p.id AND (st.given_name LIKE :name OR st.family_name LIKE :name OR st.student_number LIKE :name)))'
            );
            params.name = `%${filters.name}%`;
        }

        if (filters.showOnlyNonLoggedIn) {
            whereClauses.push(
                'p.last_login_at IS NULL AND (p.arn IS NULL OR p.arn = "")'
            );
        }

        const whereClause = whereClauses.join(' AND ');

        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM Parent p
            WHERE ${whereClause}`,
            params
        );

        return result[0].total;
    }

    /**
     * Find students by parent IDs
     */
    async findStudentsByParentIds(
        parentIds: number[]
    ): Promise<Array<StudentBasicInfo & { parent_id: number }>> {
        if (parentIds.length === 0) return [];

        return await DB.query(
            `SELECT 
                sp.parent_id,
                st.id,
                st.email,
                st.phone_number,
                st.given_name,
                st.family_name,
                st.student_number
            FROM StudentParent sp
            INNER JOIN Student st ON st.id = sp.student_id
            WHERE sp.parent_id IN (:ids)`,
            { ids: parentIds }
        );
    }

    /**
     * Find parent by ID with school verification
     */
    async findById(
        parentId: string,
        schoolId: string
    ): Promise<ParentDetailRow | null> {
        const result = await DB.query(
            `SELECT 
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name,
                p.created_at,
                p.last_login_at,
                p.arn
            FROM Parent p
            WHERE p.id = :id AND p.school_id = :school_id`,
            {
                id: parentId,
                school_id: schoolId,
            }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find students by parent ID
     */
    async findStudentsByParentId(
        parentId: number
    ): Promise<StudentBasicInfo[]> {
        return await DB.query(
            `SELECT
                st.id,
                st.email,
                st.phone_number,
                st.given_name,
                st.family_name,
                st.student_number
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON sp.student_id = st.id
            WHERE sp.parent_id = :parent_id`,
            {
                parent_id: parentId,
            }
        );
    }

    /**
     * Check if parent exists by email or phone
     */
    async findDuplicateByEmailOrPhone(
        email: string | null,
        phone: string
    ): Promise<
        Array<{ id: number; email: string | null; phone_number: string }>
    > {
        return await DB.query(
            'SELECT id, phone_number, email FROM Parent WHERE phone_number = :phone_number OR email = :email',
            {
                email: email || null,
                phone_number: phone,
            }
        );
    }

    /**
     * Create a new parent
     */
    async create(data: CreateParentData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
            VALUE (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id)`,
            data
        );
        return result.insertId;
    }

    /**
     * Update parent data
     */
    async update(parentId: number, data: UpdateParentData): Promise<void> {
        await DB.execute(
            `UPDATE Parent SET
                email = :email,
                family_name = :family_name,
                given_name = :given_name
            WHERE id = :id`,
            {
                ...data,
                id: parentId,
            }
        );
    }

    /**
     * Find parent for deletion (includes cognito_sub_id)
     */
    async findForDelete(
        parentId: string,
        schoolId: string
    ): Promise<ParentForDelete | null> {
        const result = await DB.query(
            `SELECT
                id, cognito_sub_id, email,
                phone_number, given_name,
                family_name, created_at, last_login_at
            FROM Parent
            WHERE id = :id AND school_id = :school_id`,
            {
                id: parentId,
                school_id: schoolId,
            }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Delete parent by ID
     */
    async delete(parentId: number): Promise<void> {
        await DB.execute('DELETE FROM Parent WHERE id = :id', {
            id: parentId,
        });
    }

    /**
     * Find students by IDs
     */
    async findStudentsByIds(studentIds: number[]): Promise<StudentBasicInfo[]> {
        if (studentIds.length === 0) return [];

        return await DB.query(
            `SELECT st.id, st.email, st.phone_number, st.given_name, st.family_name, st.student_number
            FROM Student AS st
            WHERE st.id IN (:students)`,
            {
                students: studentIds,
            }
        );
    }

    /**
     * Attach students to parent
     */
    async attachStudents(
        parentId: number,
        studentIds: number[]
    ): Promise<void> {
        if (studentIds.length === 0) return;

        const values = studentIds
            .map(studentId => `(${parentId}, ${studentId})`)
            .join(', ');
        await DB.execute(
            `INSERT INTO StudentParent (parent_id, student_id) VALUES ${values}`
        );
    }

    /**
     * Find parent for resending password
     */
    async findForResend(parentId: string): Promise<ParentForResend | null> {
        const result = await DB.query(
            `SELECT
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name
            FROM Parent p
            WHERE p.id = :parentId`,
            {
                parentId: parentId,
            }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find parents for bulk resend (by IDs)
     */
    async findForBulkResend(
        parentIds: number[]
    ): Promise<ParentForBulkResend[]> {
        if (parentIds.length === 0) return [];

        const placeholders = parentIds.map(() => '?').join(', ');
        return await DB.query(
            `SELECT
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name,
                p.last_login_at,
                p.arn
            FROM Parent p
            WHERE p.id IN (${placeholders})`,
            parentIds
        );
    }

    /**
     * Find parent with students (for parent-student relationship)
     */
    async findWithStudents(
        parentId: string,
        schoolId: string
    ): Promise<{
        parent: ParentWithStudentsInfo | null;
        students: StudentForParent[];
    }> {
        const parentResult = await DB.query(
            `SELECT
                id, email, phone_number,
                given_name, family_name, created_at
            FROM Parent
            WHERE id = :id AND school_id = :school_id`,
            {
                id: parentId,
                school_id: schoolId,
            }
        );

        if (parentResult.length === 0) {
            return { parent: null, students: [] };
        }

        const students = await DB.query(
            `SELECT st.id, st.given_name, st.family_name
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON sp.student_id = st.id
            WHERE sp.parent_id = :parent_id`,
            {
                parent_id: parentId,
            }
        );

        return {
            parent: parentResult[0],
            students,
        };
    }

    /**
     * Find students for parent (secure version with school verification)
     */
    async findStudentsForParent(
        parentId: string,
        schoolId: string
    ): Promise<StudentBasicInfo[]> {
        return await DB.query(
            `SELECT
                st.id, st.email, st.phone_number,
                st.given_name, st.family_name, st.student_number
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON sp.student_id = st.id
            INNER JOIN Parent AS pa ON sp.parent_id = pa.id
            WHERE sp.parent_id = :parent_id
            AND pa.school_id = :school_id`,
            {
                parent_id: parentId,
                school_id: schoolId,
            }
        );
    }

    /**
     * Get existing student IDs for parent
     */
    async getExistingStudentIds(parentId: number): Promise<number[]> {
        const result = await DB.query(
            `SELECT student_id
            FROM StudentParent
            WHERE parent_id = :parent_id`,
            {
                parent_id: parentId,
            }
        );

        return result.map((row: any) => row.student_id);
    }

    /**
     * Remove students from parent
     */
    async removeStudents(
        parentId: number,
        studentIds: number[]
    ): Promise<void> {
        if (studentIds.length === 0) return;

        await DB.query(
            `DELETE FROM StudentParent
            WHERE parent_id = :parent_id AND student_id IN (:studentIds)`,
            {
                parent_id: parentId,
                studentIds: studentIds,
            }
        );

        // Also remove related posts
        await DB.query(
            `DELETE pp
            FROM PostStudent AS ps
            INNER JOIN PostParent AS pp ON pp.post_student_id = ps.id
            WHERE pp.parent_id = :parent_id AND ps.student_id IN (:studentIds)`,
            {
                parent_id: parentId,
                studentIds: studentIds,
            }
        );
    }

    /**
     * Add students to parent
     */
    async addStudents(parentId: number, studentIds: number[]): Promise<void> {
        if (studentIds.length === 0) return;

        const values = studentIds
            .map(studentId => `(${studentId}, ${parentId})`)
            .join(', ');
        await DB.query(
            `INSERT INTO StudentParent (student_id, parent_id)
            VALUES ${values}`
        );
    }
}

export const parentRepository = new ParentRepository();
