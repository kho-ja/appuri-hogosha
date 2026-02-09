/**
 * Post Repository
 *
 * Data access layer for Post entity
 * Only SQL queries - no business logic
 */

import DB from '../../utils/db-client';
// ==================== Interfaces ====================

export interface PostRow {
    id: number;
    title: string;
    description: string;
    priority: string;
    image: string | null;
    admin_id: number;
    school_id: number;
    sent_at: Date;
    edited_at: Date | null;
}

export interface PostDetailRow {
    id: number;
    title: string;
    description: string;
    priority: string;
    sent_at: Date;
    edited_at: Date | null;
    image: string | null;
    admin_id: number;
    given_name: string;
    family_name: string;
    read_count: number;
    unread_count: number;
}

export interface PostListRow {
    id: number;
    title: string;
    description: string;
    priority: string;
    sent_at: Date;
    edited_at: Date | null;
    read_percent: number;
    admin_id: number;
    admin_given_name: string;
    admin_family_name: string;
}

export interface CreatePostData {
    title: string;
    description: string;
    priority: string;
    admin_id: number;
    school_id: number;
    image?: string | null;
}

export interface UpdatePostData {
    title: string;
    description: string;
    priority: string;
    image: string | null;
    id: number;
    school_id: number;
}

export interface ListFilters {
    title?: string;
    description?: string;
    priority?: string;
    sent_at_from?: string;
    sent_at_to?: string;
}

// ==================== Repository Class ====================

export class PostRepository {
    /**
     * Create a new post
     */
    async create(data: CreatePostData): Promise<number> {
        const result = await DB.execute(
            `INSERT INTO Post (title, description, priority, admin_id, image, school_id)
            VALUES (:title, :description, :priority, :admin_id, :image, :school_id)`,
            {
                title: data.title,
                description: data.description,
                priority: data.priority,
                admin_id: data.admin_id,
                image: data.image || null,
                school_id: data.school_id,
            }
        );

        return result.insertId;
    }

    /**
     * Find post by ID with admin and read stats
     */
    async findByIdWithStats(
        id: number,
        schoolId: number
    ): Promise<PostDetailRow | null> {
        const result = await DB.query(
            `SELECT po.id, po.title, po.description, po.priority, po.sent_at, po.edited_at, po.image,
                    ad.id AS admin_id, ad.given_name, ad.family_name,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN pp.parent_id END) AS read_count,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.parent_id END) AS unread_count
            FROM Post AS po
            INNER JOIN Admin AS ad ON po.admin_id = ad.id
            LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
            LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
            WHERE po.id = :id AND po.school_id = :school_id
            GROUP BY po.id, ad.id, ad.given_name, ad.family_name`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find post by ID (simple)
     */
    async findById(id: number, schoolId: number): Promise<PostRow | null> {
        const result = await DB.query(
            `SELECT id, title, description, priority, image, admin_id, school_id, sent_at, edited_at
            FROM Post
            WHERE id = :id AND school_id = :school_id`,
            { id, school_id: schoolId }
        );

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Find posts with pagination and filters
     */
    async findWithPagination(
        schoolId: number,
        limit: number,
        offset: number,
        filters?: ListFilters
    ): Promise<PostListRow[]> {
        const filterClauses: string[] = ['po.school_id = :school_id'];
        const params: any = {
            school_id: schoolId,
            limit,
            offset,
        };

        if (filters?.title) {
            filterClauses.push('po.title LIKE :title');
            params.title = `%${filters.title}%`;
        }
        if (filters?.description) {
            filterClauses.push('po.description LIKE :description');
            params.description = `%${filters.description}%`;
        }
        if (filters?.priority) {
            filterClauses.push('po.priority = :priority');
            params.priority = filters.priority;
        }
        if (filters?.sent_at_from) {
            filterClauses.push('DATE(po.sent_at) >= :sent_at_from');
            params.sent_at_from = filters.sent_at_from;
        }
        if (filters?.sent_at_to) {
            filterClauses.push('DATE(po.sent_at) <= :sent_at_to');
            params.sent_at_to = filters.sent_at_to;
        }

        const whereClause = 'WHERE ' + filterClauses.join(' AND ');

        const result = await DB.query(
            `SELECT po.id, po.title, po.description, po.priority, po.sent_at, po.edited_at,
                    ad.id AS admin_id, ad.given_name AS admin_given_name, ad.family_name AS admin_family_name,
                    COALESCE(ROUND((
                        COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN ps.student_id END) /
                        NULLIF(COUNT(DISTINCT ps.student_id), 0)
                    ) * 100, 2), 0) AS read_percent
            FROM Post AS po
            INNER JOIN Admin AS ad ON ad.id = po.admin_id
            LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
            LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
            ${whereClause}
            GROUP BY po.id, ad.id, ad.given_name, ad.family_name
            ORDER BY po.sent_at DESC
            LIMIT :limit OFFSET :offset`,
            params
        );

        return result;
    }

    /**
     * Count posts with filters
     */
    async countWithFilters(
        schoolId: number,
        filters?: ListFilters
    ): Promise<number> {
        const filterClauses: string[] = ['po.school_id = :school_id'];
        const params: any = { school_id: schoolId };

        if (filters?.title) {
            filterClauses.push('po.title LIKE :title');
            params.title = `%${filters.title}%`;
        }
        if (filters?.description) {
            filterClauses.push('po.description LIKE :description');
            params.description = `%${filters.description}%`;
        }
        if (filters?.priority) {
            filterClauses.push('po.priority = :priority');
            params.priority = filters.priority;
        }
        if (filters?.sent_at_from) {
            filterClauses.push('DATE(po.sent_at) >= :sent_at_from');
            params.sent_at_from = filters.sent_at_from;
        }
        if (filters?.sent_at_to) {
            filterClauses.push('DATE(po.sent_at) <= :sent_at_to');
            params.sent_at_to = filters.sent_at_to;
        }

        const whereClause = 'WHERE ' + filterClauses.join(' AND ');

        const result = await DB.query(
            `SELECT COUNT(*) AS total FROM (
                SELECT DISTINCT po.id
                FROM Post AS po
                INNER JOIN Admin AS ad ON ad.id = po.admin_id
                LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                ${whereClause}
            ) AS subquery`,
            params
        );

        return result[0].total;
    }

    /**
     * Update post
     */
    async update(data: UpdatePostData): Promise<void> {
        await DB.execute(
            `UPDATE Post
            SET title = :title, description = :description, priority = :priority,
                image = :image, edited_at = NOW()
            WHERE id = :id AND school_id = :school_id`,
            data
        );
    }

    /**
     * Delete post
     */
    async delete(id: number): Promise<void> {
        await DB.execute('DELETE FROM Post WHERE id = :id', { id });
    }

    /**
     * Find posts by IDs for deletion (includes image field)
     */
    async findByIdsForDeletion(
        postIds: number[],
        schoolId: number
    ): Promise<{ id: number; image: string | null }[]> {
        if (postIds.length === 0) return [];

        const result = await DB.query(
            `SELECT id, image FROM Post WHERE school_id = :school_id AND id IN (:postIds)`,
            { school_id: schoolId, postIds }
        );

        return result;
    }

    /**
     * Delete multiple posts
     */
    async deleteMultiple(postIds: number[], schoolId: number): Promise<void> {
        if (postIds.length === 0) return;

        const placeholders = postIds.map(() => '?').join(',');
        await DB.query(
            `DELETE FROM Post WHERE school_id = ? AND id IN (${placeholders})`,
            [schoolId, ...postIds]
        );
    }

    /**
     * Reset push notifications for updated post
     */
    async resetPushNotifications(postId: number): Promise<void> {
        await DB.execute(
            `UPDATE PostParent SET push = 0
            WHERE post_student_id IN (SELECT id FROM PostStudent WHERE post_id = :post_id)
            AND viewed_at IS NULL`,
            { post_id: postId }
        );
    }

    // ==================== View Operations ====================

    /**
     * Find students for a post with pagination and filters
     */
    async findStudentsForPost(
        postId: number,
        page: number,
        perPage: number,
        filters: {
            email?: string;
            student_number?: string;
        }
    ): Promise<{ students: any[]; total: number }> {
        let query = `
            SELECT 
                s.id,
                s.email,
                s.phone_number,
                s.given_name,
                s.family_name,
                s.student_number,
                ps.id as post_student_id
            FROM Student s
            INNER JOIN PostStudent ps ON s.id = ps.student_id
            WHERE ps.post_id = ?
        `;

        const params: any[] = [postId];

        if (filters.email) {
            query += ' AND s.email LIKE ?';
            params.push(`%${filters.email}%`);
        }

        if (filters.student_number) {
            query += ' AND s.student_number LIKE ?';
            params.push(`%${filters.student_number}%`);
        }

        // Get total count
        const countQuery = query
            .replace(/SELECT[\s\S]+?FROM/i, 'SELECT COUNT(*) as total FROM')
            .replace(/,\s*ps\.id\s+as\s+post_student_id\s*FROM/i, ' FROM');

        const countRows = (await DB.query(countQuery, params)) as any[];
        const total = countRows[0]?.total || 0;

        // Get paginated results
        query += ' ORDER BY s.given_name, s.family_name LIMIT ? OFFSET ?';
        params.push(perPage, (page - 1) * perPage);

        const rows = (await DB.query(query, params)) as any[];

        return { students: rows, total };
    }

    /**
     * Find parents for a student in a post
     */
    async findParentsForStudent(postStudentId: number): Promise<any[]> {
        const rows = (await DB.query(
            `
            SELECT 
                p.id,
                p.given_name,
                p.family_name,
                pp.viewed_at
            FROM Parent p
            INNER JOIN PostParent pp ON pp.parent_id = p.id
            WHERE pp.post_student_id = ?
            `,
            [postStudentId]
        )) as any[];

        return rows;
    }

    /**
     * Find student with parents by post and student ID
     */
    async findStudentWithParentsByPostStudent(
        postId: number,
        studentId: number
    ): Promise<any> {
        const studentRows = (await DB.query(
            `
            SELECT 
                s.id,
                s.email,
                s.phone_number,
                s.given_name,
                s.family_name,
                s.student_number
            FROM Student s
            INNER JOIN PostStudent ps ON s.id = ps.student_id
            WHERE ps.post_id = ? AND s.id = ?
            `,
            [postId, studentId]
        )) as any[];

        if (studentRows.length === 0) {
            return null;
        }

        const parentRows = (await DB.query(
            `
            SELECT 
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name,
                pp.viewed_at
            FROM Parent p
            INNER JOIN PostParent pp ON pp.parent_id = p.id
            INNER JOIN PostStudent pst ON pst.id = pp.post_student_id
            WHERE pst.student_id = ? AND pst.post_id = ?
            `,
            [studentId, postId]
        )) as any[];

        return {
            student: studentRows[0],
            parents: parentRows,
        };
    }

    /**
     * Find groups for a post with pagination and filters
     */
    async findGroupsForPost(
        postId: number,
        page: number,
        perPage: number,
        filters: {
            name?: string;
        }
    ): Promise<{ groups: any[]; total: number }> {
        let query = `
            SELECT 
                g.id,
                g.name,
                COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN pp.parent_id END) as viewed_count,
                COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.parent_id END) as not_viewed_count
            FROM StudentGroup g
            INNER JOIN PostStudent pst ON pst.group_id = g.id
            LEFT JOIN PostParent pp ON pp.post_student_id = pst.id
            WHERE pst.post_id = ?
        `;

        const params: any[] = [postId];

        if (filters.name) {
            query += ' AND g.name LIKE ?';
            params.push(`%${filters.name}%`);
        }

        query += ' GROUP BY g.id, g.name';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM (${query}) as grouped`;
        const countRows = (await DB.query(countQuery, params)) as any[];
        const total = countRows[0]?.total || 0;

        // Get paginated results
        query += ' ORDER BY g.name LIMIT ? OFFSET ?';
        params.push(perPage, (page - 1) * perPage);

        const rows = (await DB.query(query, params)) as any[];

        return { groups: rows, total };
    }

    /**
     * Find students in a group for a post
     */
    async findGroupStudents(
        postId: number,
        groupId: number,
        page: number,
        perPage: number,
        filters: {
            email?: string;
            student_number?: string;
        }
    ): Promise<{ students: any[]; total: number }> {
        let query = `
            SELECT DISTINCT
                s.id,
                s.email,
                s.phone_number,
                s.given_name,
                s.family_name,
                s.student_number,
                ps.id as post_student_id
            FROM Student s
            INNER JOIN GroupMember gs ON s.id = gs.student_id
            INNER JOIN PostStudent ps ON s.id = ps.student_id
            WHERE gs.group_id = ? AND ps.post_id = ?
        `;

        const params: any[] = [groupId, postId];

        if (filters.email) {
            query += ' AND s.email LIKE ?';
            params.push(`%${filters.email}%`);
        }

        if (filters.student_number) {
            query += ' AND s.student_number LIKE ?';
            params.push(`%${filters.student_number}%`);
        }

        // Get total count
        const countQuery = query
            .replace(
                /SELECT DISTINCT[\s\S]+?FROM/i,
                'SELECT COUNT(DISTINCT s.id) as total FROM'
            )
            .replace(/,\s*ps\.id\s+as\s+post_student_id\s*FROM/i, ' FROM');

        const countRows = (await DB.query(countQuery, params)) as any[];
        const total = countRows[0]?.total || 0;

        // Get paginated results
        query += ' ORDER BY s.given_name, s.family_name LIMIT ? OFFSET ?';
        params.push(perPage, (page - 1) * perPage);

        const rows = (await DB.query(query, params)) as any[];

        return { students: rows, total };
    }

    /**
     * Find group by ID
     */
    async findGroupById(groupId: number): Promise<any> {
        const rows = (await DB.query(
            'SELECT id, name FROM StudentGroup WHERE id = ?',
            [groupId]
        )) as any[];

        return rows[0] || null;
    }

    /**
     * Find group student with parents
     */
    async findGroupStudentWithParents(
        postId: number,
        groupId: number,
        studentId: number
    ): Promise<any> {
        const groupRows = (await DB.query(
            'SELECT id, name FROM StudentGroup WHERE id = ?',
            [groupId]
        )) as any[];

        if (groupRows.length === 0) {
            return null;
        }

        const studentRows = (await DB.query(
            `
            SELECT 
                s.id,
                s.email,
                s.phone_number,
                s.given_name,
                s.family_name,
                s.student_number
            FROM Student s
            INNER JOIN GroupMember gs ON s.id = gs.student_id
            INNER JOIN PostStudent ps ON s.id = ps.student_id
            WHERE gs.group_id = ? AND ps.post_id = ? AND s.id = ?
            `,
            [groupId, postId, studentId]
        )) as any[];

        if (studentRows.length === 0) {
            return null;
        }

        const parentRows = (await DB.query(
            `
            SELECT 
                p.id,
                p.email,
                p.phone_number,
                p.given_name,
                p.family_name,
                pp.viewed_at
            FROM Parent p
            INNER JOIN PostParent pp ON pp.parent_id = p.id
            INNER JOIN PostStudent pst ON pst.id = pp.post_student_id
            WHERE pst.student_id = ? AND pst.post_id = ? AND pst.group_id = ?
            `,
            [studentId, postId, groupId]
        )) as any[];

        return {
            group: groupRows[0],
            student: studentRows[0],
            parents: parentRows,
        };
    }

    // ==================== Retry Push Operations ====================

    /**
     * Reset push notifications for a group
     */
    async resetGroupPushNotifications(
        postId: number,
        groupId: number
    ): Promise<void> {
        await DB.execute(
            `
            UPDATE PostParent pp
            INNER JOIN StudentParent ps ON pp.parent_id = ps.parent_id
            INNER JOIN GroupMember gs ON ps.student_id = gs.student_id
            SET pp.should_send_push_notification = 0
            WHERE pp.post_id = ? AND gs.group_id = ?
            `,
            [postId, groupId]
        );
    }

    /**
     * Reset push notifications for a student
     */
    async resetStudentPushNotifications(
        postId: number,
        studentId: number
    ): Promise<void> {
        await DB.execute(
            `
            UPDATE PostParent pp
            INNER JOIN StudentParent ps ON pp.parent_id = ps.parent_id
            SET pp.should_send_push_notification = 0
            WHERE pp.post_id = ? AND ps.student_id = ?
            `,
            [postId, studentId]
        );
    }

    /**
     * Reset push notification for a parent
     */
    async resetParentPushNotification(
        postId: number,
        parentId: number
    ): Promise<void> {
        await DB.execute(
            'UPDATE PostParent SET should_send_push_notification = 0 WHERE post_id = ? AND parent_id = ?',
            [postId, parentId]
        );
    }

    // ==================== Update Senders ====================

    /**
     * Delete all post students
     */
    async deletePostStudents(postId: number): Promise<void> {
        await DB.execute('DELETE FROM PostStudent WHERE post_id = ?', [postId]);
    }

    /**
     * Delete all post groups
     */
    async deletePostGroups(postId: number): Promise<void> {
        await DB.execute('DELETE FROM GroupPost WHERE post_id = ?', [postId]);
    }

    /**
     * Delete post parents not in student list
     */
    async deletePostParentsNotInStudents(
        postId: number,
        studentIds: number[]
    ): Promise<void> {
        if (studentIds.length === 0) {
            await DB.execute('DELETE FROM PostParent WHERE post_id = ?', [
                postId,
            ]);
            return;
        }

        const placeholders = studentIds.map(() => '?').join(',');
        await DB.execute(
            `
            DELETE FROM PostParent 
            WHERE post_id = ? 
            AND parent_id NOT IN (
                SELECT DISTINCT ps.parent_id 
                FROM StudentParent ps 
                WHERE ps.student_id IN (${placeholders})
            )
            `,
            [postId, ...studentIds]
        );
    }

    /**
     * Insert post students
     */
    async insertPostStudents(
        postId: number,
        studentIds: number[]
    ): Promise<void> {
        if (studentIds.length === 0) return;

        const values = studentIds
            .map(studentId => `(${postId}, ${studentId})`)
            .join(',');
        await DB.execute(
            `INSERT IGNORE INTO PostStudent (post_id, student_id) VALUES ${values}`
        );
    }

    /**
     * Insert post groups
     */
    async insertPostGroups(postId: number, groupIds: number[]): Promise<void> {
        if (groupIds.length === 0) return;

        const values = groupIds
            .map(groupId => `(${postId}, ${groupId})`)
            .join(',');
        await DB.execute(
            `INSERT IGNORE INTO GroupPost (post_id, group_id) VALUES ${values}`
        );
    }

    /**
     * Find parents by student IDs
     */
    async findParentsByStudents(studentIds: number[]): Promise<number[]> {
        if (studentIds.length === 0) return [];

        const placeholders = studentIds.map(() => '?').join(',');
        const [rows] = (await DB.query(
            `SELECT DISTINCT parent_id FROM StudentParent WHERE student_id IN (${placeholders})`,
            studentIds
        )) as any[];

        return rows.map((row: any) => row.parent_id);
    }

    /**
     * Insert post parents
     */
    async insertPostParents(
        postId: number,
        parentIds: number[]
    ): Promise<void> {
        if (parentIds.length === 0) return;

        const values = parentIds
            .map(parentId => `(${postId}, ${parentId}, 0)`)
            .join(',');
        await DB.execute(
            `INSERT IGNORE INTO PostParent (post_id, parent_id, should_send_push_notification) VALUES ${values}`
        );
    }
}

export const postRepository = new PostRepository();
