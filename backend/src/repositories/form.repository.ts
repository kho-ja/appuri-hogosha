// Repository: faqat SQL query va DB access
// Business logic yo'q, faqat data fetch/update

import DB from '../utils/db-client';

export interface FormFilters {
    reason?: string;
    status?: string;
}

export interface FormRow {
    id: number;
    reason: string;
    date: string;
    additional_message: string | null;
    sent_at: string;
    status: string;
    parent_id: number;
    parent_family_name: string;
    parent_given_name: string;
    student_id: number;
    student_family_name: string;
    student_given_name: string;
}

class FormRepository {
    /**
     * Get forms by school ID with optional filters
     */
    async findBySchoolId(
        schoolId: string,
        limit: number,
        offset: number,
        filters: FormFilters = {}
    ): Promise<FormRow[]> {
        const whereClauses: string[] = ['fo.school_id = :school_id'];
        const params: any = {
            school_id: schoolId,
            limit,
            offset,
        };

        if (filters.reason) {
            whereClauses.push('fo.reason = :reason');
            params.reason = filters.reason;
        }

        if (filters.status) {
            whereClauses.push('fo.status = :status');
            params.status = filters.status;
        }

        const whereClause = whereClauses.join(' AND ');

        return await DB.query(
            `SELECT
                fo.id, fo.reason, DATE_FORMAT(fo.date, '%Y-%m-%d') AS date, 
                fo.additional_message,
                DATE_FORMAT(fo.sent_at, '%Y-%m-%d %H:%i:%s') AS sent_at, 
                fo.status,
                pa.id AS parent_id, 
                pa.family_name AS parent_family_name, 
                pa.given_name AS parent_given_name,
                st.id AS student_id, 
                st.family_name AS student_family_name, 
                st.given_name AS student_given_name
            FROM Form AS fo
            INNER JOIN Parent AS pa ON fo.parent_id = pa.id
            INNER JOIN Student AS st ON fo.student_id = st.id
            WHERE ${whereClause}
            ORDER BY fo.id DESC
            LIMIT :limit OFFSET :offset`,
            params
        );
    }

    /**
     * Count forms by school ID with optional filters
     */
    async countBySchoolId(
        schoolId: string,
        filters: FormFilters = {}
    ): Promise<number> {
        const whereClauses: string[] = ['fo.school_id = :school_id'];
        const params: any = {
            school_id: schoolId,
        };

        if (filters.reason) {
            whereClauses.push('fo.reason = :reason');
            params.reason = filters.reason;
        }

        if (filters.status) {
            whereClauses.push('fo.status = :status');
            params.status = filters.status;
        }

        const whereClause = whereClauses.join(' AND ');

        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM Form AS fo 
            WHERE ${whereClause}`,
            params
        );

        return result[0].total;
    }

    /**
     * Count waiting forms by school ID
     */
    async countWaitingBySchoolId(schoolId: string): Promise<number> {
        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM Form 
            WHERE school_id = :school_id AND status = 'wait'`,
            { school_id: schoolId }
        );

        return result[0].total;
    }

    /**
     * Find form by ID and school ID
     */
    async findById(id: string, schoolId: string): Promise<FormRow | null> {
        const result = await DB.query(
            `SELECT
                fo.id, fo.reason, DATE_FORMAT(fo.date, '%Y-%m-%d') AS date, 
                fo.additional_message,
                DATE_FORMAT(fo.sent_at, '%Y-%m-%d %H:%i:%s') AS sent_at, 
                fo.status,
                pa.id AS parent_id, 
                pa.family_name AS parent_family_name, 
                pa.given_name AS parent_given_name,
                pa.phone_number AS parent_phone_number,
                st.id AS student_id, 
                st.family_name AS student_family_name, 
                st.given_name AS student_given_name,
                st.phone_number AS student_phone_number, 
                st.student_number
            FROM Form AS fo
            INNER JOIN Parent AS pa ON fo.parent_id = pa.id
            INNER JOIN Student AS st ON fo.student_id = st.id
            WHERE fo.school_id = :school_id AND fo.id = :id`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Update form status
     */
    async updateStatus(id: string, status: string): Promise<void> {
        await DB.execute(`UPDATE Form SET status = :status WHERE id = :id`, {
            status,
            id,
        });
    }
}

export const formRepository = new FormRepository();
