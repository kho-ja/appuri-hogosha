import DB from '../../../utils/db-client';

export class MobileStudentRepository {
    async listUnreadCountsByParentId(parentId: number): Promise<any[]> {
        return await DB.query(
            `SELECT
                st.id,
                (SELECT COUNT(*)
                 FROM PostParent pp
                 INNER JOIN PostStudent ps ON pp.post_student_id = ps.id
                 INNER JOIN Post po ON ps.post_id = po.id
                 WHERE pp.parent_id = sp.parent_id
                 AND ps.student_id = sp.student_id
                 AND pp.viewed_at IS NULL) AS unread_count
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON st.id = sp.student_id
            WHERE sp.parent_id = :parent_id;`,
            {
                parent_id: parentId,
            }
        );
    }

    async listStudentsByParentId(parentId: number): Promise<any[]> {
        return await DB.query(
            `SELECT
                st.id,
                st.family_name,
                st.given_name,
                st.student_number,
                st.email,
                st.phone_number,
                st.cohort,
                COUNT(DISTINCT ps.id) AS messageCount,
                COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.id END) AS unread_count
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON st.id = sp.student_id
            LEFT JOIN PostStudent AS ps ON ps.student_id = st.id
            LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                AND pp.parent_id = sp.parent_id
            WHERE sp.parent_id = :parent_id
            GROUP BY st.id, st.family_name, st.given_name, st.student_number, st.email, st.phone_number, st.cohort;`,
            {
                parent_id: parentId,
            }
        );
    }
}

export const mobileStudentRepository = new MobileStudentRepository();
