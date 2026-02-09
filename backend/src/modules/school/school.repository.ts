/**
 * School Repository
 *
 * Data access layer for School entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';

// ==================== Interfaces ====================

export interface SchoolInfo {
    id: number;
    name: string;
    contact_email: string;
    sms_high: number;
    sms_medium: number;
    sms_low: number;
}

export interface SchoolBasicInfo {
    name: string;
    contact_email: string;
}

export interface UpdateSmsPriorityData {
    high: number;
    medium: number;
    low: number;
    name: string;
    id: number;
}

export interface UpdateSchoolNameData {
    name: string;
    id: number;
}

// ==================== Repository Class ====================

export class SchoolRepository {
    /**
     * Find school by ID with SMS settings
     */
    async findById(id: number): Promise<SchoolInfo | null> {
        const result = await DB.query(
            `SELECT contact_email, name, sms_high, sms_medium, sms_low
            FROM School
            WHERE id = :id`,
            { id }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Update SMS priority settings and school name
     */
    async updateSmsPriority(data: UpdateSmsPriorityData): Promise<void> {
        await DB.execute(
            `UPDATE School 
            SET sms_high = :high, sms_medium = :medium, sms_low = :low, name = :name
            WHERE id = :id`,
            data
        );
    }

    /**
     * Update school name only
     */
    async updateName(data: UpdateSchoolNameData): Promise<void> {
        await DB.execute(
            `UPDATE School 
            SET name = :name
            WHERE id = :id`,
            data
        );
    }

    /**
     * Get basic school info (name and email)
     */
    async getBasicInfo(id: number): Promise<SchoolBasicInfo | null> {
        const result = await DB.query(
            `SELECT contact_email, name
            FROM School
            WHERE id = :id`,
            { id }
        );

        return result.length > 0 ? result[0] : null;
    }
}

export const schoolRepository = new SchoolRepository();
