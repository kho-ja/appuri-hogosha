import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth'
import express, { Response, Router } from "express";
import DB from '../../utils/db-client'
import { Images3Client } from '../../utils/s3-client'
import {
    isValidString,
    isValidArrayId,
    isValidPriority, isValidId, isValidStringArrayId,
} from '../../utils/validate'
import process from "node:process";
import { generatePaginationLinks, randomImageName } from "../../utils/helper";
import cron from "node-cron";
import { DateTime } from "luxon";

class SchedulePostController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/', verifyToken, this.schedulePost)
        this.router.get('/list', verifyToken, this.scheduledPostList)
        this.router.get('/each/:id', verifyToken, this.scheduledPostView)
        this.router.get('/:id/recievers', verifyToken, this.scheduledPostRecievers)
        this.router.delete('/:id', verifyToken, this.deleteScheduledPost)
        this.router.put('/:id', verifyToken, this.updateScheduledPost)
        this.router.put('/:id/recievers', verifyToken, this.updateScheduledPostRecievers)
        this.router.post('/delete-multiple', verifyToken, this.deleteMultipleScheduledPosts)

        cron.schedule("* * * * *", async () => {
            console.log("Checking for scheduled messages...", `${new Date()}`);
            this.createPlannedMessage();
        });
    }

    schedulePost = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                title,
                description,
                priority,
                students,
                groups,
                image,
                scheduled_at: scheduled_at_string
            } = req.body

            const utc = DateTime.fromISO(scheduled_at_string).toUTC();
            const formattedUTC = utc.toFormat('yyyy-MM-dd HH:mm:ss'); 

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_title'
                }
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_description'
                }
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_priority'
                }
            }

            let postInsert;
            if (image) {
                const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    throw {
                        status: 401,
                        message: 'invalid_image_format'
                    }
                }
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.length > 1024 * 1024 * 10) {
                    throw {
                        status: 401,
                        message: 'image_size_too_large'
                    }
                }

                const imageName = randomImageName() + mimeType.replace('image/', '.');
                const imagePath = 'images/' + imageName;
                const uploadResult = await Images3Client.uploadFile(buffer, mimeType, imagePath);

                postInsert = await DB.execute(`
                INSERT INTO scheduledPost (title, description, priority, admin_id, image, school_id, scheduled_at)
                    VALUE (:title, :description, :priority, :admin_id, :image, :school_id, :scheduled_at);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    image: imageName,
                    admin_id: req.user.id,
                    school_id: req.user.school_id,
                    scheduled_at: formattedUTC,
                });
            } else {
                postInsert = await DB.execute(`
                INSERT INTO scheduledPost (title, description, priority, admin_id, school_id, scheduled_at)
                    VALUE (:title, :description, :priority, :admin_id, :school_id, :scheduled_at);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    admin_id: req.user.id,
                    school_id: req.user.school_id,
                    scheduled_at: formattedUTC,
                });
            }

            const scheduled_post_id = postInsert.insertId;

            const values = [] as any;

            students.forEach((student_id: any) => {
                values.push([scheduled_post_id, null, student_id]);
            });

            groups.forEach((group_id: any) => {
                values.push([scheduled_post_id, group_id, null]);
            });

            const updatedValues = values.map((value: any) => `(${value[0]}, ${value[1]}, ${value[2]})`).join(', ');

            const result = await DB.query(`
                INSERT INTO scheduledPostRecievers (scheduled_post_id, group_id, student_id)
                VALUES ${updatedValues}
            `);

            return res.status(200).json({
                post: {
                    title,
                    description,
                    priority,
                    scheduled_at: formattedUTC,
                },
                });
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    scheduledPostList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '') || 10;
            const offset = (page - 1) * limit;
    
            const priority = req.query.priority as string || '';
            const text = req.query.text as string || '';
    
            const filters: string[] = ['sp.school_id = :school_id'];
            const params: any = {
                school_id: req.user.school_id,
                limit,
                offset
            };
    
            if (priority && isValidPriority(priority)) {
                filters.push('sp.priority = :priority');
                params.priority = priority;
            }
            if (text) {
                filters.push('(sp.title LIKE :text OR sp.description LIKE :text)');
                params.text = `%${text}%`;
            }
    
            const whereClause = 'WHERE ' + filters.join(' AND ');
    
            const postList = await DB.query(`
                SELECT sp.id,
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
                LIMIT :limit OFFSET :offset
            `, params);
    
            const totalPostsResult = await DB.query(`
                SELECT COUNT(*) AS total FROM (
                    SELECT DISTINCT sp.id
                    FROM scheduledPost AS sp
                    INNER JOIN Admin AS ad ON ad.id = sp.admin_id
                    ${whereClause}
                ) AS subquery
            `, params);
            const totalPosts = totalPostsResult[0].total;
            const totalPages = Math.ceil(totalPosts / limit);
    
            if (page > totalPages && totalPages !== 0) {
                return res.status(400).json({ error: 'invalid_page' }).end();
            }
    
            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_posts: totalPosts,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };
    
            const formattedPostList = postList.map(({
                id,
                title,
                description,
                priority,
                scheduled_at,
                sent_at,
                edited_at,
                admin_id,
                admin_given_name,
                admin_family_name
            }: any) => ({
                id,
                title,
                description,
                priority,
                scheduled_at,
                sent_at,
                edited_at,
                admin: {
                    id: admin_id,
                    given_name: admin_given_name,
                    family_name: admin_family_name
                }
            }));
    
            return res.status(200).json({
                scheduledPosts: formattedPostList,
                pagination
            }).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    scheduledPostView = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const postInfo = await DB.query(`SELECT sp.id,
                                                    sp.title,
                                                    sp.description,
                                                    sp.priority,
                                                    sp.scheduled_at,
                                                    sp.created_at,
                                                    sp.edited_at,
                                                    sp.image,
                                                    ad.id                                                                    AS admin_id,
                                                    ad.given_name,
                                                    ad.family_name
                                             FROM scheduledPost AS sp
                                                      INNER JOIN Admin AS ad ON sp.admin_id = ad.id
                                             WHERE sp.id = :id
                                               AND sp.school_id = :school_id
                                             GROUP BY sp.id, ad.id, ad.given_name, ad.family_name`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const post = postInfo[0];
            const utcDate = DateTime.fromJSDate(post.scheduled_at).toISO();

            return res.status(200).json({
                post: {
                    id: post.id,
                    title: post.title,
                    description: post.description,
                    image: post.image,
                    priority: post.priority,
                    scheduled_at: utcDate,
                    sent_at: post.created_at,
                    edited_at: post.edited_at ? post.edited_at : post.created_at,
                },
                admin: {
                    id: post.admin_id,
                    given_name: post.given_name,
                    family_name: post.family_name,
                },
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    deleteScheduledPost = async (req: ExtendedRequest, res: Response) => {
        try{
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }
            const postInfo = await DB.query(`SELECT id,
                                                    title,
                                                    description,
                                                    priority,
                                                    scheduled_at,
                                                    image
                                             FROM scheduledPost
                                             WHERE school_id = :school_id
                                               AND id = :id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {

                throw {
                    status: 404,
                    message: 'Scheduled Post not found'
                }
            }

            Images3Client.deleteFile('images/' + postInfo[0].image)

            await DB.execute('DELETE FROM scheduledPost WHERE id = :id;', {
                id: postId,
            })

            return res.status(200).json({
                message: 'scheduledPostDeleted'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    updateScheduledPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const {
                title,
                description,
                priority,
                scheduled_at: scheduled_at_string,
                image,
            } = req.body

            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const localTime = DateTime.fromISO(scheduled_at_string, { zone: 'utc' }).setZone(userTimezone);
            const formattedUTC = localTime.toFormat('yyyy-MM-dd HH:mm:ss');

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_title'
                }
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_description'
                }
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_priority'
                }
            }

            const postInfo = await DB.query(`SELECT id,
                                                    title,
                                                    description,
                                                    priority,
                                                    scheduled_at,
                                                    image
                                             FROM scheduledPost
                                             WHERE school_id = :school_id
                                               AND id = :id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const post = postInfo[0]

            if (image && image !== post.image) {
                const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
                
                if (!matches || matches.length !== 3) {
                    throw {
                        status: 401,
                        message: 'Invalid image format. Make sure it is Base64 encoded.'
                    };
                }
            
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
            
                if (buffer.length > 10 * 1024 * 1024) {
                    throw {
                        status: 401,
                        message: 'Image size is too large (max 10MB)'
                    };
                }
            
                const imageName = randomImageName() + mimeType.replace('image/', '.');
                const imagePath = `images/${imageName}`;
                await Images3Client.uploadFile(buffer, mimeType, imagePath);
            
                post.image = imageName; 
            } else if (!image) {
                post.image = null; 
            }
            
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
                    id: post.id,
                    school_id: req.user.school_id,
                    title,
                    description,
                    priority,
                    scheduled_at: formattedUTC,
                    image: post.image,
                }
            );

            return res.status(200).json({
                message: 'Scheduled Post edited successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    updateScheduledPostRecievers = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const post = await DB.query(`Select 
                title, description, priority, image, scheduled_at, admin_id, school_id 
                from scheduledPost where id = :postId and school_id = :school_id`, {
                    postId: postId,
                    school_id: req.user.school_id
                }
            );

            if (post.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const { students, groups } = req.body

            const deleteOldRecievers = await DB.query(`

                DELETE FROM scheduledPostRecievers
                WHERE scheduled_post_id = ${postId}
            `);

            const values = [] as any;

            students?.forEach((student_id: any) => {
                values.push([postId, null, student_id]);
            });
          
            groups?.forEach((group_id: any) => {
                values.push([postId, group_id, null]);
            });
            
            if (values.length === 0) {
                return res.status(200).json({ message: 'Receivers cleared successfully, nothing new to insert.' });
            }
            const updatedValues = values.map((value: any) => `(${value[0]}, ${value[1]}, ${value[2]})`).join(', ');

            const insertNewRecievers = await DB.query(`
                INSERT INTO scheduledPostRecievers (scheduled_post_id, group_id, student_id)
                VALUES ${updatedValues}`
            );
            
            return res.status(200).json({
                message: 'Receivers updated successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

    scheduledPostRecievers = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const postInfo = await DB.query(`SELECT sp.id
                                         FROM scheduledPost AS sp
                                         WHERE sp.id = :id
                                           AND sp.school_id = :school_id`, {
                id: postId,
                school_id: req.user.school_id,
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const recievers = await DB.query(`
            SELECT group_id, student_id
            FROM scheduledPostRecievers
            WHERE scheduled_post_id = :postId
        `, { postId });

            const groupIds = recievers.filter((r: any) => r.group_id).map((r: any) => r.group_id);
            const studentIds = recievers.filter((r: any) => r.student_id).map((r: any) => r.student_id);

            let groups = [];
            if (groupIds.length > 0) {
                groups = await DB.query(`
                SELECT id, name
                FROM StudentGroup
                WHERE id IN (:groupIds)
                  AND school_id = :school_id
            `, { groupIds, school_id: req.user.school_id });
            }

            let students = [];
            if (studentIds.length > 0) {
                students = await DB.query(`
                SELECT id, given_name, family_name, student_number, email, phone_number
                FROM Student
                WHERE id IN (:studentIds)
                  AND school_id = :school_id
            `, { studentIds, school_id: req.user.school_id });
            }

            return res.status(200).json({
                groups,
                students
            }).end();
        } catch (err: any) {
            return res.status(500).json({
                error: 'internal_server_error'
            }).end();
        }
    }

    createPlannedMessage = async () => {
        const scheduledPostList = await DB.query(`Select * from scheduledPost`)

        if(scheduledPostList.length <= 0){
            return console.log('no scheduled post found')
        }

        scheduledPostList.map(async (post: any) => {
            const {
                title, 
                description, 
                priority, 
                image, 
                scheduled_at: scheduled_at_string, 
                admin_id, 
                school_id, 
            } = post

            const scheduled_at = DateTime.fromJSDate(scheduled_at_string).toISO();
            const now = new Date().toISOString()

            if(!scheduled_at){
                return console.error('scheduled_at is missing')
            }

            if(now < scheduled_at){
                return;
            }

            const scheduledPostId = post.id;

            let postInsert;
            if (image) {
                postInsert = await DB.execute(`
                INSERT INTO Post (title, description, priority, admin_id, image, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :image, :school_id);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    admin_id: admin_id,
                    image: image,
                    school_id: school_id,
                });
            } else {
                postInsert = await DB.execute(`
                INSERT INTO Post (title, description, priority, admin_id, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :school_id);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    admin_id: admin_id,
                    school_id: school_id,
                });
            }
        
            const postId = postInsert.insertId;

            const recieversObject = await DB.query(`
                SELECT 
                    GROUP_CONCAT(DISTINCT group_id) AS groupMembers,
                    GROUP_CONCAT(DISTINCT student_id) AS students
                FROM scheduledPostRecievers
                WHERE scheduled_post_id = ${scheduledPostId}
            `);

            const row = recieversObject[0];
            const groups = row.groupMembers ? row.groupMembers.split(',').map(Number) : [];
            const students = row.students ? row.students.split(',').map(Number) : [];
            if (students && Array.isArray(students) && isValidStringArrayId(students) && students.length > 0) {
                const studentList = await DB.query(
                    `SELECT st.id
                    FROM Student AS st
                    WHERE st.id IN (:students)`,
                    { students }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id) VALUE (:post_id, :student_id)`, {
                            post_id: postId,
                            student_id: student.id,
                        });

                        const studentAttachList = await DB.query(`SELECT sp.parent_id
                            FROM StudentParent AS sp
                            WHERE sp.student_id = :student_id`,
                        {
                            student_id: student.id
                        });

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList.map((student: any) => `(${post_student.insertId}, ${student.parent_id})`).join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id)
                                VALUES ${studentValues}`
                            );
                        }
                    }
                }
            }
            if (groups && Array.isArray(groups) && isValidArrayId(groups) && groups.length > 0) {
                const studentList = await DB.query(
                    `SELECT gm.student_id, gm.group_id
                    FROM GroupMember AS gm
                        RIGHT JOIN StudentGroup sg on gm.group_id = sg.id
                    WHERE group_id IN (:groups)
                    AND sg.school_id = :school_id`, 
                {
                    groups: groups,
                    school_id: school_id
                });

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id, group_id) VALUE (:post_id, :student_id, :group_id)`, {
                            post_id: postId,
                            student_id: student.student_id,
                            group_id: student.group_id
                        });

                        const studentAttachList = await DB.query(`SELECT sp.parent_id
                            FROM StudentParent AS sp
                            WHERE sp.student_id = :student_id`,
                        {
                            student_id: student.student_id
                        });

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList.map((student: any) => `(${post_student.insertId}, ${student.parent_id})`).join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id)
                                VALUES ${studentValues}`
                            );
                        }
                    }
                }
            }

            // deleteing the scheduled post
            await DB.execute(`DELETE FROM scheduledPost WHERE id = ${scheduledPostId}`);

            console.log('scheduled post posted successfully')
        })
    }

    deleteMultipleScheduledPosts = async (req: ExtendedRequest, res: Response) => {
        try {
            const postIds: number[] = req.body.ids;

            if (!Array.isArray(postIds) || postIds.length === 0) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_ids'
                };
            }

            const placeholders = postIds.map(() => '?').join(',');

            const postsInfo = await DB.query(`
                SELECT id, image
                FROM scheduledPost
                WHERE school_id = ?
                  AND id IN (${placeholders})
            `, [req.user.school_id, ...postIds]);

            if (postsInfo.length === 0) {
                throw {
                    status: 404,
                    message: 'No scheduled posts found'
                };
            }

            for (const post of postsInfo) {
                if (post.image) {
                    await Images3Client.deleteFile('images/' + post.image);
                }
            }

            await DB.execute(`
                DELETE FROM scheduledPost
                WHERE school_id = ?
                  AND id IN (${placeholders})
            `, [req.user.school_id, ...postIds]);

            return res.status(200).json({
                message: 'scheduledPostsDeleted',
                deletedCount: postsInfo.length
            }).end();

        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'internal_server_error'
                }).end();
            }
        }
    }

}

export default SchedulePostController