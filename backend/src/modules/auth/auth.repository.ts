import DB from '../../utils/db-client';
import { AdminWithSchool } from './auth.dto';

export class AuthRepository {
    async findAdminByEmail(email: string): Promise<AdminWithSchool | null> {
        const rows = await DB.query(
            `SELECT
                ad.id, ad.email, ad.phone_number,
                ad.given_name, ad.family_name,
                sc.name AS school_name
            FROM Admin AS ad
            INNER JOIN School AS sc ON sc.id = ad.school_id
            WHERE ad.email = :email`,
            { email }
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0] as AdminWithSchool;
    }

    async updateLastLogin(adminId: number): Promise<void> {
        await DB.execute(
            'UPDATE Admin SET last_login_at = NOW() WHERE id = :id',
            { id: adminId }
        );
    }
}
