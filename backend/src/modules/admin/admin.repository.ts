/**
 * Admin Repository
 *
 * Data access layer for Admin entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';

// ==================== Interfaces ====================

export interface AdminRow {
    id: number;
    cognito_sub_id: string;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    created_at: Date;
    last_login_at: Date;
}

export interface AdminBasicRow {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface AdminDetailRow extends AdminBasicRow {
    created_at: Date;
}

export interface CreateAdminData {
    cognito_sub_id: string;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    school_id: number;
}

export interface UpdateAdminData {
    phone_number: string;
    given_name: string;
    family_name: string;
    id: number;
}

export interface DuplicateCheckResult {
    email?: string;
    phone_number?: string;
}

export interface ListFilters {
    email?: string;
    phone_number?: string;
    name?: string;
}

// ==================== Repository Class ====================

export class AdminRepository {
    /**
     * Create a new admin
     */
    async create(data: CreateAdminData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO Admin
            (cognito_sub_id, email, phone_number, given_name, family_name, created_at, last_login_at, permissions, school_id)
            VALUES (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, NOW(), NOW(), '{}', :school_id)`,
            data
        );

        return result.insertId;
    }

    /**
     * Find admin by ID
     */
    async findById(
        id: number,
        schoolId: number
    ): Promise<AdminDetailRow | null> {
        const result = await DB.query(
            `SELECT id, email, phone_number, given_name, family_name, created_at
            FROM Admin
            WHERE id = :id AND school_id = :school_id`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find admins with pagination and filters
     */
    async findWithPagination(
        schoolId: number,
        limit: number,
        offset: number,
        filters?: ListFilters
    ): Promise<AdminBasicRow[]> {
        const filterClauses: string[] = [];
        const params: any = {
            school_id: schoolId,
            limit,
            offset,
        };

        if (filters?.email) {
            filterClauses.push('email LIKE :email');
            params.email = `%${filters.email}%`;
        }
        if (filters?.phone_number) {
            filterClauses.push('phone_number LIKE :phone_number');
            params.phone_number = `%${filters.phone_number}%`;
        }
        if (filters?.name) {
            filterClauses.push(
                '(given_name LIKE :name OR family_name LIKE :name)'
            );
            params.name = `%${filters.name}%`;
        }

        const whereClause =
            filterClauses.length > 0
                ? 'AND ' + filterClauses.join(' AND ')
                : '';

        const result = await DB.query(
            `SELECT id, email, phone_number, given_name, family_name
            FROM Admin
            WHERE school_id = :school_id ${whereClause}
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset`,
            params
        );

        return result;
    }

    /**
     * Count admins with filters
     */
    async countWithFilters(
        schoolId: number,
        filters?: ListFilters
    ): Promise<number> {
        const filterClauses: string[] = [];
        const params: any = { school_id: schoolId };

        if (filters?.email) {
            filterClauses.push('email LIKE :email');
            params.email = `%${filters.email}%`;
        }
        if (filters?.phone_number) {
            filterClauses.push('phone_number LIKE :phone_number');
            params.phone_number = `%${filters.phone_number}%`;
        }
        if (filters?.name) {
            filterClauses.push(
                '(given_name LIKE :name OR family_name LIKE :name)'
            );
            params.name = `%${filters.name}%`;
        }

        const whereClause =
            filterClauses.length > 0
                ? 'AND ' + filterClauses.join(' AND ')
                : '';

        const result = await DB.query(
            `SELECT COUNT(*) as total
            FROM Admin
            WHERE school_id = :school_id ${whereClause}`,
            params
        );

        return result[0].total;
    }

    /**
     * Update admin
     */
    async update(data: UpdateAdminData): Promise<void> {
        await DB.execute(
            `UPDATE Admin SET
                phone_number = :phone_number,
                family_name = :family_name,
                given_name = :given_name
            WHERE id = :id`,
            data
        );
    }

    /**
     * Delete admin
     */
    async delete(id: number): Promise<void> {
        await DB.execute('DELETE FROM Admin WHERE id = :id', { id });
    }

    /**
     * Find duplicate by email or phone number
     */
    async findDuplicateByEmailOrPhone(
        email: string,
        phoneNumber: string
    ): Promise<DuplicateCheckResult | null> {
        const result = await DB.query(
            'SELECT phone_number, email FROM Admin WHERE phone_number = :phone_number OR email = :email',
            { email, phone_number: phoneNumber }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find duplicate phone number excluding specific admin ID
     */
    async findDuplicatePhoneExcludingId(
        phoneNumber: string,
        _excludeId: number
    ): Promise<{ id: number; phone_number: string } | null> {
        const result = await DB.query(
            'SELECT id, phone_number FROM Admin WHERE phone_number = :phone_number',
            { phone_number: phoneNumber }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Get admin info for deletion (includes cognito_sub_id and email for cleanup)
     */
    async getAdminInfoForDeletion(
        id: number,
        schoolId: number
    ): Promise<{ id: number; cognito_sub_id: string; email: string } | null> {
        const result = await DB.query(
            `SELECT id, cognito_sub_id, email, phone_number, given_name, family_name, created_at, last_login_at
            FROM Admin
            WHERE id = :id AND school_id = :school_id`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }
}

export const adminRepository = new AdminRepository();
