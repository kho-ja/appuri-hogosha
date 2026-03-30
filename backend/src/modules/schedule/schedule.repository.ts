import DB from '../../utils/db-client';
import {
    ScheduledPostWithAdmin,
    ScheduledPostBasic,
    ScheduledPostReceiver,
    GroupBasic,
    StudentBasic,
} from './schedule.dto';

export class ScheduleRepository {
    async create(data: {
        title: string;
        description: string;
        priority: string;
        admin_id: number;
        school_id: number;
        image?: string;
        scheduled_at: string;
    }): Promise<number> {
        const result = await DB.execute(
            data.image
                ? `INSERT INTO scheduledPost (title, description, priority, admin_id, image, school_id, scheduled_at)
                   VALUE (:title, :description, :priority, :admin_id, :image, :school_id, :scheduled_at)`
                : `INSERT INTO scheduledPost (title, description, priority, admin_id, school_id, scheduled_at)
                   VALUE (:title, :description, :priority, :admin_id, :school_id, :scheduled_at)`,
            data
        );

        return result.insertId;
    }

    async insertReceivers(
        scheduledPostId: number,
        students: number[],
        groups: number[]
    ): Promise<void> {
        const values: any[] = [];

        students.forEach(student_id => {
            values.push([scheduledPostId, null, student_id]);
        });

        groups.forEach(group_id => {
            values.push([scheduledPostId, group_id, null]);
        });

        if (values.length === 0) return;

        const updatedValues = values
            .map(value => `(${value[0]}, ${value[1]}, ${value[2]})`)
            .join(', ');

        await DB.query(`
            INSERT INTO scheduledPostRecievers (scheduled_post_id, group_id, student_id)
            VALUES ${updatedValues}
        `);
    }

    async findWithPagination(filters: {
        school_id: number;
        limit: number;
        offset: number;
        priority?: string;
        text?: string;
    }): Promise<ScheduledPostWithAdmin[]> {
        const filterClauses: string[] = ['sp.school_id = :school_id'];
        const params: any = {
            school_id: filters.school_id,
            limit: filters.limit,
            offset: filters.offset,
        };

        if (filters.priority) {
            filterClauses.push('sp.priority = :priority');
            params.priority = filters.priority;
        }
        if (filters.text) {
            filterClauses.push(
                '(sp.title LIKE :text OR sp.description LIKE :text)'
            );
            params.text = `%${filters.text}%`;
        }

        const whereClause = 'WHERE ' + filterClauses.join(' AND ');

        const rows = await DB.query(
            `SELECT sp.id,
                    sp.title,
                    sp.description,
                    sp.priority,
                    sp.scheduled_at,
                    ad.id          AS admin_id,
                    ad.given_name  AS admin_given_name,
                    ad.family_name AS admin_family_name,
                    sp.created_at,
                    sp.edited_at
             FROM scheduledPostRecievers AS spr
             INNER JOIN scheduledPost as sp on sp.id = spr.scheduled_post_id
             INNER JOIN Admin AS ad ON ad.id = sp.admin_id
             ${whereClause}
             GROUP BY sp.id, ad.id, ad.given_name, ad.family_name
             ORDER BY sp.created_at DESC
             LIMIT :limit OFFSET :offset`,
            params
        );

        return rows as ScheduledPostWithAdmin[];
    }

    async count(filters: {
        school_id: number;
        priority?: string;
        text?: string;
    }): Promise<number> {
        const filterClauses: string[] = ['sp.school_id = :school_id'];
        const params: any = {
            school_id: filters.school_id,
        };

        if (filters.priority) {
            filterClauses.push('sp.priority = :priority');
            params.priority = filters.priority;
        }
        if (filters.text) {
            filterClauses.push(
                '(sp.title LIKE :text OR sp.description LIKE :text)'
            );
            params.text = `%${filters.text}%`;
        }

        const whereClause = 'WHERE ' + filterClauses.join(' AND ');

        const result = await DB.query(
            `SELECT COUNT(*) AS total FROM (
                SELECT DISTINCT sp.id
                FROM scheduledPost AS sp
                INNER JOIN Admin AS ad ON ad.id = sp.admin_id
                ${whereClause}
            ) AS subquery`,
            params
        );

        return result[0].total;
    }

    async findById(
        id: number,
        schoolId: number
    ): Promise<ScheduledPostBasic | null> {
        const rows = await DB.query(
            `SELECT sp.id,
                    sp.title,
                    sp.description,
                    sp.priority,
                    sp.scheduled_at,
                    sp.created_at,
                    sp.edited_at,
                    sp.image,
                    ad.id          AS admin_id,
                    ad.given_name,
                    ad.family_name
             FROM scheduledPost AS sp
             INNER JOIN Admin AS ad ON sp.admin_id = ad.id
             WHERE sp.id = :id
               AND sp.school_id = :school_id
             GROUP BY sp.id, ad.id, ad.given_name, ad.family_name`,
            { id, school_id: schoolId }
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0] as any;
    }

    async deleteById(id: number): Promise<void> {
        await DB.execute('DELETE FROM scheduledPost WHERE id = :id', { id });
    }

    async update(
        id: number,
        schoolId: number,
        data: {
            title: string;
            description: string;
            priority: string;
            scheduled_at: string;
            image: string | null;
        }
    ): Promise<void> {
        await DB.execute(
            `UPDATE scheduledPost
             SET title       = :title,
                 description = :description,
                 priority    = :priority,
                 scheduled_at = :scheduled_at,
                 image       = :image,
                 edited_at   = NOW()
             WHERE id = :id
               AND school_id = :school_id`,
            {
                id,
                school_id: schoolId,
                ...data,
            }
        );
    }

    async findReceivers(
        scheduledPostId: number
    ): Promise<ScheduledPostReceiver[]> {
        const rows = await DB.query(
            `SELECT group_id, student_id
             FROM scheduledPostRecievers
             WHERE scheduled_post_id = :scheduledPostId`,
            { scheduledPostId }
        );

        return rows as ScheduledPostReceiver[];
    }

    async findGroupsByIds(
        groupIds: number[],
        schoolId: number
    ): Promise<GroupBasic[]> {
        if (groupIds.length === 0) return [];

        const rows = await DB.query(
            `SELECT id, name
             FROM StudentGroup
             WHERE id IN (:groupIds)
               AND school_id = :schoolId`,
            { groupIds, schoolId }
        );

        return rows as GroupBasic[];
    }

    async findStudentsByIds(
        studentIds: number[],
        schoolId: number
    ): Promise<StudentBasic[]> {
        if (studentIds.length === 0) return [];

        const rows = await DB.query(
            `SELECT id, given_name, family_name, student_number, email, phone_number
             FROM Student
             WHERE id IN (:studentIds)
               AND school_id = :schoolId`,
            { studentIds, schoolId }
        );

        return rows as StudentBasic[];
    }

    async deleteReceivers(scheduledPostId: number): Promise<void> {
        await DB.query(
            `DELETE FROM scheduledPostRecievers WHERE scheduled_post_id = :scheduledPostId`,
            { scheduledPostId }
        );
    }

    async findByIds(
        ids: number[],
        schoolId: number
    ): Promise<Array<{ id: number; image: string | null }>> {
        if (ids.length === 0) return [];

        const placeholders = ids.map(() => '?').join(',');

        const rows = await DB.query(
            `SELECT id, image
             FROM scheduledPost
             WHERE school_id = ?
               AND id IN (${placeholders})`,
            [schoolId, ...ids]
        );

        return rows as Array<{ id: number; image: string | null }>;
    }

    async deleteByIds(ids: number[], schoolId: number): Promise<void> {
        if (ids.length === 0) return;

        const placeholders = ids.map(() => '?').join(',');

        await DB.execute(
            `DELETE FROM scheduledPost
             WHERE school_id = ?
               AND id IN (${placeholders})`,
            [schoolId, ...ids]
        );
    }

    async findAllScheduled(): Promise<ScheduledPostBasic[]> {
        const rows = await DB.query('SELECT * FROM scheduledPost');
        return rows as ScheduledPostBasic[];
    }

    async findReceiversByScheduledPostId(scheduledPostId: number): Promise<{
        groups: number[];
        students: number[];
    }> {
        const result = await DB.query(
            `SELECT
                GROUP_CONCAT(DISTINCT group_id) AS groupMembers,
                GROUP_CONCAT(DISTINCT student_id) AS students
             FROM scheduledPostRecievers
             WHERE scheduled_post_id = :scheduledPostId`,
            { scheduledPostId }
        );

        const row = result[0];
        const groups = row.groupMembers
            ? row.groupMembers.split(',').map(Number)
            : [];
        const students = row.students
            ? row.students.split(',').map(Number)
            : [];

        return { groups, students };
    }
}
