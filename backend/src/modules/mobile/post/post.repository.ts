import DB from '../../../utils/db-client';

export class MobilePostRepository {
    async findPostParentData(params: {
        postParentId: string;
        parentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT pp.id,
                    po.title,
                    po.description                              AS content,
                    po.priority,
                    po.image,
                    DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                    DATE_FORMAT(pp.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                    DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                    sg.name                                     AS group_name
             FROM PostParent AS pp
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                      INNER JOIN Post AS po ON po.id = ps.post_id
                      LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
             WHERE pp.id = :post_id
               AND pp.parent_id = :parent_id;`,
            {
                post_id: params.postParentId,
                parent_id: params.parentId,
            }
        );
    }

    async findPostByPostId(params: {
        postId: string;
        parentId: number;
        studentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT po.id,
                    po.title,
                    po.description                              AS content,
                    po.priority,
                    DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                    DATE_FORMAT(pp.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                    DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                    sg.name                                     AS group_name
             FROM PostParent as pp
                      INNER JOIN PostStudent as ps
                                 ON ps.id = pp.post_student_id AND ps.student_id = :student_id
                      INNER JOIN Post AS po ON po.id = ps.post_id
                      LEFT JOIN StudentGroup as sg ON sg.id = ps.group_id
             WHERE pp.parent_id = :parent_id
               AND po.id = :post_id LIMIT 1;`,
            {
                parent_id: params.parentId,
                student_id: params.studentId,
                post_id: params.postId,
            }
        );
    }

    async listPosts(params: {
        parentId: number;
        studentId: number;
        lastPostId: number;
        lastSentAt: string;
        limit: number;
    }): Promise<any[]> {
        if (params.lastPostId === 0) {
            return await DB.query(
                `SELECT pp.id,
                        po.title,
                        po.description                              AS content,
                        po.priority,
                        po.image,
                        DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                        DATE_FORMAT(pp.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                        DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                        sg.name                                     AS group_name
                 FROM PostParent as pp
                          INNER JOIN PostStudent as ps
                                     ON ps.id = pp.post_student_id AND ps.student_id = :student_id
                          INNER JOIN Post AS po ON po.id = ps.post_id
                          LEFT JOIN StudentGroup as sg ON sg.id = ps.group_id
                 WHERE pp.parent_id = :parent_id
                 ORDER BY po.sent_at DESC LIMIT :limit`,
                {
                    parent_id: params.parentId,
                    student_id: params.studentId,
                    limit: params.limit,
                }
            );
        }

        return await DB.query(
            `SELECT pp.id,
                    po.title,
                    po.description                              AS content,
                    po.priority,
                    po.image,
                    DATE_FORMAT(po.sent_at, '%Y-%m-%d %H:%i')   AS sent_time,
                    DATE_FORMAT(pp.viewed_at, '%Y-%m-%d %H:%i') AS viewed_at,
                    DATE_FORMAT(po.edited_at, '%Y-%m-%d %H:%i') AS edited_at,
                    sg.name                                     AS group_name
             FROM PostParent AS pp
                      INNER JOIN PostStudent AS ps
                              ON ps.id = pp.post_student_id AND ps.student_id = :student_id
                      INNER JOIN Post AS po ON po.id = ps.post_id
                      LEFT JOIN StudentGroup AS sg ON sg.id = ps.group_id
             WHERE pp.parent_id = :parent_id
               AND (
                   po.sent_at < :last_sent_at OR
                   (po.sent_at = :last_sent_at AND pp.id < :last_post_id)
               )
             ORDER BY po.sent_at DESC, pp.id DESC
             LIMIT :limit;`,
            {
                parent_id: params.parentId,
                student_id: params.studentId,
                last_post_id: params.lastPostId,
                last_sent_at: params.lastSentAt,
                limit: params.limit,
            }
        );
    }

    async listUnreadPostParentIds(params: {
        parentId: number;
        studentId: number;
        postIds: number[];
    }): Promise<any[]> {
        return await DB.query(
            `SELECT pp.id
             FROM PostParent AS pp
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
             WHERE ps.student_id = :student_id
               AND pp.id IN (:post_ids)
               AND pp.parent_id = :parent_id
               AND pp.viewed_at IS NULL;`,
            {
                post_ids: params.postIds,
                student_id: params.studentId,
                parent_id: params.parentId,
            }
        );
    }

    async markViewedByIds(postParentIds: number[]): Promise<void> {
        if (postParentIds.length === 0) return;

        const postIdList = postParentIds.join(',');
        await DB.execute(
            `UPDATE PostParent
             SET viewed_at = NOW()
             WHERE id IN (${postIdList});`
        );
    }

    async markViewedById(postParentId: number): Promise<void> {
        await DB.execute(
            'UPDATE PostParent SET viewed_at = NOW() WHERE id = :id',
            {
                id: postParentId,
            }
        );
    }

    async markViewedForPostId(postId: string): Promise<void> {
        await DB.execute(
            `UPDATE PostParent
             SET viewed_at = NOW()
             WHERE id = :post_id;`,
            { post_id: postId }
        );
    }

    async findPostParentForView(params: {
        postParentId: number;
        parentId: number;
        studentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT pp.id, pp.viewed_at
             FROM PostParent AS pp
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
             WHERE ps.student_id = :student_id
               AND pp.id = :post_id
               AND pp.parent_id = :parent_id;`,
            {
                post_id: params.postParentId,
                student_id: params.studentId,
                parent_id: params.parentId,
            }
        );
    }
}

export const mobilePostRepository = new MobilePostRepository();
