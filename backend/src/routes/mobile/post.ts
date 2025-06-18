import { IController } from '../../utils/icontroller';
import { Response, Router } from "express";
import { ExtendedRequest, verifyToken } from '../../middlewares/mobileAuth'
import DB from '../../utils/db-client'
import process from "node:process";

class PostController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/posts', verifyToken, this.posts)
        this.router.get('/posts/:id', verifyToken, this.post)
        this.router.post('/view', verifyToken, this.viewPost)
        this.router.post('/view/extended', verifyToken, this.viewExtends)
        this.router.get('/post/:post_id', verifyToken, this.getPostData)
    }

    getPostData = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_id } = req.params;

            const post = await DB.query(`SELECT pp.id,
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
                                       AND pp.parent_id = :parent_id;`, {
                post_id: post_id,
                parent_id: req.user.id,
            });


            if (post.length == 0) {
                return res.status(404).json({
                    error: 'Post not found'
                }).end();
            }

            return res.status(200).json({
                post: post[0]
            }).end();
        } catch (e: any) {
            return res.status(500).json({
                error: 'Internal server error'
            }).end();
        }

    }

    post = async (req: ExtendedRequest, res: Response) => {
        try {
            const { id: post_id } = req.params;
            const { student_id } = req.body;

            const post = await DB.query(`
                SELECT po.id,
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
                  AND po.id = :post_id LIMIT 1;`, {
                parent_id: req.user.id,
                student_id: student_id,
                post_id: post_id,
            });

            if (post.length == 0) {
                return res.status(404).json(post).end();
            }

            await DB.execute(`UPDATE PostParent
                                      SET viewed_at = NOW()
                                      WHERE id = :post_id;`, { post_id: post_id });

            post[0].images = [];

            return res.status(200).json({
                post: post[0],
                message: "Successfully fetched post"
            }).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res.status(500).json({ error: 'Internal server error' }).end();
            }
        }
    }
    posts = async (req: ExtendedRequest, res: Response) => {
        try {
            const { student_id, last_post_id, last_sent_at, read_post_ids } = req.body;

            if (read_post_ids && read_post_ids.length > 0) {
                const viewedPosts = await DB.query(`SELECT pp.id
                                                    FROM PostParent AS pp
                                                             INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                                                    WHERE ps.student_id = :student_id
                                                      AND pp.id IN (:post_ids)
                                                      AND pp.parent_id = :parent_id
                                                      AND pp.viewed_at IS NULL;`, {
                    post_ids: read_post_ids,
                    student_id: student_id,
                    parent_id: req.user.id,
                });

                if (viewedPosts.length > 0) {
                    const postIdList = viewedPosts.map((post: any) => post.id).join(',');
                    await DB.execute(`UPDATE PostParent
                                      SET viewed_at = NOW()
                                      WHERE id IN (${postIdList});`);
                }
            }

            let posts;
            if (last_post_id == 0) {
                posts = await DB.query(`SELECT pp.id,
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
                                        ORDER BY po.sent_at DESC LIMIT :limit`, {
                    parent_id: req.user.id,
                    student_id: student_id,
                    limit: parseInt(process.env.PER_PAGE + '')
                });
            } else {
                posts = await DB.query(
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
                        parent_id: req.user.id,
                        student_id: student_id,
                        last_post_id: last_post_id,
                        last_sent_at: last_sent_at,
                        limit: parseInt(process.env.PER_PAGE + '')
                    }
                );
                
            }

            return res.status(200).json({
                posts: posts,
                message: read_post_ids && read_post_ids.length > 0 ? "Successfully viewed and fetched posts" : "Successfully fetched posts"
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    viewPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_id, student_id } = req.body

            const post = await DB.query(`SELECT pp.id, pp.viewed_at
                                         FROM PostParent AS pp
                                                  INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                                         WHERE ps.student_id = :student_id
                                           AND pp.id = :post_id
                                           AND pp.parent_id = :parent_id;`, {
                post_id: post_id,
                student_id: student_id,
                parent_id: req.user.id,
            })

            if (post.length == 0) {
                throw {
                    status: 404,
                    message: 'Post not Found'
                }
            }

            if (post[0].viewed_at) {
                throw {
                    status: 403,
                    message: 'Post already viewed'
                }
            }

            await DB.execute('UPDATE PostParent SET viewed_at = NOW() WHERE id = :id', {
                id: post_id,
            });

            return res.status(200).json({
                message: "Successfully viewed"
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    viewExtends = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_ids, student_id } = req.body

            const posts = await DB.query(`SELECT pp.id
                                          FROM PostParent AS pp
                                                   INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                                          WHERE ps.student_id = :student_id
                                            AND pp.id IN (:post_ids)
                                            AND pp.parent_id = :parent_id
                                            AND pp.viewed_at IS NULL;`, {
                post_ids: post_ids,
                student_id: student_id,
                parent_id: req.user.id,
            })

            if (posts.length == 0) {
                throw {
                    status: 404,
                    message: 'Post not Found'
                }
            }

            const postIdList = posts.map((post: any) => post.id).join(',');

            await DB.execute(`UPDATE PostParent
                              SET viewed_at = NOW()
                              WHERE id IN (${postIdList});`);

            return res.status(200).json({
                message: "Successfully viewed"
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }
}

export default PostController