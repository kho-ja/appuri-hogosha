import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';
import DB from '../../utils/db-client';
import { Images3Client } from '../../utils/s3-client';
import {
    isValidString,
    isValidArrayId,
    isValidPriority,
    isValidId,
    isValidStringArrayId,
    isValidStudentNumber,
} from '../../utils/validate';
import process from 'node:process';
import { generatePaginationLinks, randomImageName } from '../../utils/helper';
import { stringify } from 'csv-stringify';
import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    RowError,
    CSVRowBase,
    bumpSummary,
    handleCSVUpload,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';

// CSV upload now uses shared middleware (handleCSVUpload)

class PostController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createPost);
        this.router.get('/list', verifyToken, this.postList);
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadPostsFromCSV
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/:id', verifyToken, this.postView);
        this.router.put('/:id', verifyToken, this.postUpdate);
        this.router.put('/:id/sender', verifyToken, this.postUpdateSender);
        this.router.delete('/:id', verifyToken, this.postDelete);
        this.router.post(
            '/delete-multiple',
            verifyToken,
            this.deleteMultiplePosts
        );

        this.router.get('/:id/students', verifyToken, this.postViewStudents);
        this.router.get(
            '/:id/student/:student_id',
            verifyToken,
            this.postStudentParent
        );

        this.router.get('/:id/groups', verifyToken, this.postViewGroups);
        this.router.get(
            '/:id/group/:group_id',
            verifyToken,
            this.postGroupStudents
        );
        this.router.get(
            '/:id/group/:group_id/student/:student_id',
            verifyToken,
            this.postGroupStudentParent
        );

        this.router.post(
            '/:id/groups/:group_id',
            verifyToken,
            this.groupRetryPush
        );
        this.router.post(
            '/:id/students/:student_id',
            verifyToken,
            this.studentRetryPush
        );
        this.router.post(
            '/:id/parents/:parent_id',
            verifyToken,
            this.parentRetryPush
        );
    }

    uploadPostsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, withCSV } = req.body;
        const throwInErrorBool = throwInError === 'true';
        const withCSVBool = withCSV === 'true';

        if (!req.file || !req.file.buffer) {
            return res
                .status(400)
                .json(createErrorResponse(ErrorKeys.file_missing))
                .end();
        }

        const response = createBaseResponse<any>();
        try {
            const rawRows = await parseCSVBuffer(req.file.buffer);
            if (rawRows.length === 0) {
                response.message = 'csv_is_empty_but_valid';
                return res.status(200).json(response).end();
            }

            // Validate & normalize, merging rows with same title/description/priority
            interface PostRow extends CSVRowBase {
                title: string;
                description: string;
                priority: string;
                group_names: string[];
                student_numbers: string[];
            }
            const mergedMap: Map<string, PostRow> = new Map();
            const errors: RowError<PostRow>[] = [];

            const keyFor = (t: string, d: string, p: string) =>
                `${t}||${d}||${p}`;

            for (const row of rawRows) {
                const norm = {
                    title: String(row.title || '').trim(),
                    description: String(row.description || '').trim(),
                    priority: String(row.priority || '').trim(),
                    group_names: String(row.group_names || '')
                        .split(',')
                        .map((g: string) => g.trim())
                        .filter(Boolean),
                    student_numbers: String(row.student_numbers || '')
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                } as PostRow;

                const rowErrors: Record<string, string> = {};
                if (!isValidString(norm.title))
                    rowErrors.title = ErrorKeys.invalid_title;
                if (!isValidString(norm.description))
                    rowErrors.description = ErrorKeys.invalid_description;
                if (!isValidPriority(norm.priority))
                    rowErrors.priority = ErrorKeys.invalid_priority;

                if (norm.group_names.length) {
                    for (const gn of norm.group_names) {
                        if (!isValidString(gn)) {
                            rowErrors.group_names =
                                ErrorKeys.invalid_group_names;

                            break;
                        }
                    }
                }
                if (norm.student_numbers.length) {
                    for (const sn of norm.student_numbers) {
                        if (!isValidStudentNumber(sn)) {
                            rowErrors.student_numbers =
                                ErrorKeys.invalid_student_numbers;

                            break;
                        }
                    }
                }

                if (Object.keys(rowErrors).length > 0) {
                    errors.push({ row: norm, errors: rowErrors });
                    continue;
                }

                const key = keyFor(norm.title, norm.description, norm.priority);
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, { ...norm });
                } else {
                    const existing = mergedMap.get(key)!;
                    existing.group_names.push(...norm.group_names);
                    existing.student_numbers.push(...norm.student_numbers);
                }
            }

            if (errors.length > 0 && throwInErrorBool) {
                response.errors = errors;
                response.summary.errors = errors.length;
                return res.status(400).json(response).end();
            }

            const validPosts = Array.from(mergedMap.values()).map(p => ({
                ...p,
                group_names: Array.from(new Set(p.group_names)),
                student_numbers: Array.from(new Set(p.student_numbers)),
            }));

            // Insert posts & relations
            for (const post of validPosts) {
                const postInsert = await DB.execute(
                    `INSERT INTO Post (title, description, priority, admin_id, school_id)
                     VALUE (:title, :description, :priority, :admin_id, :school_id);`,
                    {
                        title: post.title,
                        description: post.description,
                        priority: post.priority,
                        admin_id: req.user.id,
                        school_id: req.user.school_id,
                    }
                );
                const postId = postInsert.insertId;

                // Attach students by numbers
                if (post.student_numbers.length) {
                    const studentRows = await DB.query(
                        `SELECT id, student_number FROM Student WHERE student_number IN (:student_numbers) GROUP BY student_number`,
                        { student_numbers: post.student_numbers }
                    );
                    for (const st of studentRows) {
                        const post_student = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id) VALUES (:post_id, :student_id)`,
                            { post_id: postId, student_id: st.id }
                        );
                        const parents = await DB.query(
                            `SELECT parent_id FROM StudentParent WHERE student_id = :sid`,
                            { sid: st.id }
                        );
                        if (parents.length) {
                            const values = parents
                                .map(
                                    (p: any) =>
                                        `(${post_student.insertId}, ${p.parent_id})`
                                )
                                .join(',');
                            await DB.execute(
                                `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${values}`
                            );
                        }
                    }
                }

                if (post.group_names.length) {
                    const groups = await DB.query(
                        `SELECT id, name FROM StudentGroup WHERE name IN (:names) AND school_id = :sid`,
                        { names: post.group_names, sid: req.user.school_id }
                    );
                    for (const g of groups) {
                        const members = await DB.query(
                            `SELECT student_id FROM GroupMember WHERE group_id = :gid`,
                            { gid: g.id }
                        );
                        for (const mem of members) {
                            const post_student = await DB.execute(
                                `INSERT INTO PostStudent (post_id, student_id, group_id) VALUES (:post_id, :student_id, :group_id)`,
                                {
                                    post_id: postId,
                                    student_id: mem.student_id,
                                    group_id: g.id,
                                }
                            );
                            const parents = await DB.query(
                                `SELECT parent_id FROM StudentParent WHERE student_id = :sid`,
                                { sid: mem.student_id }
                            );
                            if (parents.length) {
                                const values = parents
                                    .map(
                                        (p: any) =>
                                            `(${post_student.insertId}, ${p.parent_id})`
                                    )
                                    .join(',');
                                await DB.execute(
                                    `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${values}`
                                );
                            }
                        }
                    }
                }

                response.inserted.push({
                    title: post.title,
                    description: post.description,
                    priority: post.priority,
                    group_names: post.group_names,
                    student_numbers: post.student_numbers,
                });
            }

            bumpSummary(response, 'inserted');
            response.summary.errors = errors.length;
            response.errors = errors;
            finalizeResponse(response, withCSVBool);
            return res
                .status(errors.length ? 400 : 200)
                .json(response)
                .end();
        } catch (e: any) {
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    postUpdateSender = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const { students, groups } = req.body;

            if (!Array.isArray(students) || !Array.isArray(groups)) {
                throw {
                    status: 400,
                    message: 'invalid_input_arrays',
                };
            }

            const studentIds = students
                .filter(id => id != null)
                .map(id => parseInt(id, 10));
            const groupIds = groups
                .filter(id => id != null)
                .map(id => parseInt(id, 10));

            if (!isValidArrayId(studentIds) || !isValidArrayId(groupIds)) {
                throw {
                    status: 400,
                    message: 'invalid_student_or_group_ids',
                };
            }

            const postInfo = await DB.query(
                `SELECT id FROM Post WHERE id = :id AND school_id = :school_id`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            await DB.execute('START TRANSACTION');

            try {
                const existingPostStudents = await DB.query(
                    `SELECT id, student_id, group_id FROM PostStudent WHERE post_id = :post_id`,
                    { post_id: postId }
                );

                const existingIndividualStudents = existingPostStudents
                    .filter((ps: any) => ps.student_id && ps.group_id === null)
                    .map((ps: any) => ps.student_id);

                const existingGroupIds = existingPostStudents
                    .filter((ps: any) => ps.group_id !== null)
                    .map((ps: any) => ps.group_id);

                const studentsToAdd = studentIds.filter(
                    id => !existingIndividualStudents.includes(id)
                );
                const groupsToAdd = groupIds.filter(
                    id => !existingGroupIds.includes(id)
                );

                const studentsToRemove = existingPostStudents.filter(
                    (ps: any) =>
                        ps.student_id &&
                        ps.group_id === null &&
                        !studentIds.includes(ps.student_id)
                );
                const groupsToRemove = existingPostStudents.filter(
                    (ps: any) => ps.group_id && !groupIds.includes(ps.group_id)
                );

                if (studentsToRemove.length > 0) {
                    const studentIdsToRemove = studentsToRemove.map(
                        (ps: any) => ps.id
                    );

                    await DB.execute(
                        `DELETE FROM PostParent WHERE post_student_id IN (${studentIdsToRemove.map(() => '?').join(',')})`,
                        studentIdsToRemove
                    );

                    await DB.execute(
                        `DELETE FROM PostStudent WHERE id IN (${studentIdsToRemove.map(() => '?').join(',')})`,
                        studentIdsToRemove
                    );
                }

                if (groupsToRemove.length > 0) {
                    const groupPostStudentIds = groupsToRemove.map(
                        (ps: any) => ps.id
                    );

                    await DB.execute(
                        `DELETE FROM PostParent WHERE post_student_id IN (${groupPostStudentIds.map(() => '?').join(',')})`,
                        groupPostStudentIds
                    );

                    await DB.execute(
                        `DELETE FROM PostStudent WHERE id IN (${groupPostStudentIds.map(() => '?').join(',')})`,
                        groupPostStudentIds
                    );
                }

                for (const studentId of studentsToAdd) {
                    const studentCheck = await DB.query(
                        `SELECT id FROM Student WHERE id = :student_id AND school_id = :school_id`,
                        { student_id: studentId, school_id: req.user.school_id }
                    );

                    if (studentCheck.length === 0) {
                        throw {
                            status: 400,
                            message: `student_not_found_or_invalid: ${studentId}`,
                        };
                    }

                    const postStudentResult = await DB.execute(
                        `INSERT INTO PostStudent (post_id, student_id) VALUES (:post_id, :student_id)`,
                        { post_id: postId, student_id: studentId }
                    );

                    const studentParents = await DB.query(
                        `SELECT parent_id FROM StudentParent WHERE student_id = :student_id`,
                        { student_id: studentId }
                    );

                    if (studentParents.length > 0) {
                        for (const parent of studentParents) {
                            await DB.execute(
                                `INSERT INTO PostParent (post_student_id, parent_id) VALUES (:post_student_id, :parent_id)`,
                                {
                                    post_student_id: postStudentResult.insertId,
                                    parent_id: parent.parent_id,
                                }
                            );
                        }
                    }
                }

                for (const groupId of groupsToAdd) {
                    const groupCheck = await DB.query(
                        `SELECT id FROM StudentGroup WHERE id = :group_id AND school_id = :school_id`,
                        { group_id: groupId, school_id: req.user.school_id }
                    );

                    if (groupCheck.length === 0) {
                        throw {
                            status: 400,
                            message: `group_not_found_or_invalid: ${groupId}`,
                        };
                    }

                    const groupMembers = await DB.query(
                        `SELECT student_id FROM GroupMember WHERE group_id = :group_id`,
                        { group_id: groupId }
                    );

                    if (groupMembers.length === 0) {
                        throw {
                            status: 400,
                            message: `group_has_no_members: ${groupId}`,
                        };
                    }

                    for (const member of groupMembers) {
                        const postStudentResult = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id, group_id) VALUES (:post_id, :student_id, :group_id)`,
                            {
                                post_id: postId,
                                student_id: member.student_id,
                                group_id: groupId,
                            }
                        );

                        const studentParents = await DB.query(
                            `SELECT parent_id FROM StudentParent WHERE student_id = :student_id`,
                            { student_id: member.student_id }
                        );

                        if (studentParents.length > 0) {
                            for (const parent of studentParents) {
                                await DB.execute(
                                    `INSERT INTO PostParent (post_student_id, parent_id) VALUES (:post_student_id, :parent_id)`,
                                    {
                                        post_student_id:
                                            postStudentResult.insertId,
                                        parent_id: parent.parent_id,
                                    }
                                );
                            }
                        }
                    }
                }

                await DB.execute(
                    `UPDATE Post SET edited_at = NOW() WHERE id = :id AND school_id = :school_id`,
                    { id: postId, school_id: req.user.school_id }
                );

                await DB.execute('COMMIT');

                return res
                    .status(200)
                    .json({
                        message: 'post_sender_updated_successfully',
                    })
                    .end();
            } catch (transactionError) {
                await DB.execute('ROLLBACK');
                throw transactionError;
            }
        } catch (e: any) {
            try {
                await DB.execute('ROLLBACK');
            } catch {
                // Ignore rollback errors (transaction might not be active)
            }

            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                console.error('postUpdateSender error:', e);
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    groupRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const groupId = req.params.group_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }

            const postInfo = await DB.query(
                `SELECT po.id, ps.group_id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                             WHERE ps.post_id = :post_id
                                               AND ps.group_id = :group_id
                                               AND po.school_id = :school_id`,
                {
                    post_id: postId,
                    group_id: groupId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            await DB.execute(
                `UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id
                                                          AND group_id = :group_id)
                                AND viewed_at IS NULL`,
                {
                    post_id: post.id,
                    group_id: post.group_id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'notificationReSent',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    studentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const student_id = req.params.student_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }
            if (!student_id || !isValidId(student_id)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }

            const postInfo = await DB.query(
                `SELECT po.id, ps.student_id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                             WHERE ps.post_id = :post_id
                                               AND ps.student_id = :student_id
                                               AND po.school_id = :school_id`,
                {
                    post_id: postId,
                    student_id: student_id,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            await DB.execute(
                `UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id
                                                          AND student_id = :student_id)
                                AND viewed_at IS NULL`,
                {
                    post_id: post.id,
                    student_id: post.student_id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'notificationReSent',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    parentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const parent_id = req.params.parent_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }
            if (!parent_id || !isValidId(parent_id)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id',
                };
            }

            const postInfo = await DB.query(
                `SELECT pp.parent_id,
                                                    po.id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                                      INNER JOIN PostParent AS pp ON
                                                 ps.id = pp.post_student_id
                                             WHERE ps.post_id = :post_id
                                               AND po.school_id = :school_id
                                               AND pp.parent_id = :parent_id`,
                {
                    post_id: postId,
                    parent_id: parent_id,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            await DB.execute(
                `UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id)
                                AND parent_id = parent_id
                                AND viewed_at IS NULL`,
                {
                    post_id: post.id,
                    parent_id: post.parent_id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'notificationReSent',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }
            const postInfo = await DB.query(
                `SELECT id,
                                                    title,
                                                    description,
                                                    priority,
                                                    image
                                             FROM Post
                                             WHERE school_id = :school_id
                                               AND id = :id`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found',
                };
            }

            Images3Client.deleteFile('images/' + postInfo[0].image);

            await DB.execute('DELETE FROM Post WHERE id = :id;', {
                id: postId,
            });

            return res
                .status(200)
                .json({
                    message: 'postDeleted',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    deleteMultiplePosts = async (req: ExtendedRequest, res: Response) => {
        try {
            const postIds: number[] = req.body.ids;

            if (!Array.isArray(postIds) || postIds.length === 0) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_ids',
                };
            }

            const placeholders = postIds.map(() => '?').join(',');

            const postsInfo = await DB.query(
                `
            SELECT id, image
            FROM Post
            WHERE school_id = ?
              AND id IN (${placeholders})
        `,
                [req.user.school_id, ...postIds]
            );

            if (postsInfo.length === 0) {
                throw {
                    status: 404,
                    message: 'No posts found',
                };
            }

            for (const post of postsInfo) {
                if (post.image) {
                    await Images3Client.deleteFile('images/' + post.image);
                }
            }

            await DB.execute(
                `
            DELETE FROM Post
            WHERE school_id = ?
              AND id IN (${placeholders})
        `,
                [req.user.school_id, ...postIds]
            );

            return res
                .status(200)
                .json({
                    message: 'postsDeleted',
                    deletedCount: postsInfo.length,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postUpdate = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const { title, description, priority, image } = req.body;

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_title',
                };
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_description',
                };
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_priority',
                };
            }

            const postInfo = await DB.query(
                `SELECT id,
                                                    title,
                                                    description,
                                                    priority,
                                                    image
                                             FROM Post
                                             WHERE school_id = :school_id
                                               AND id = :id`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            if (image && image !== post.image) {
                const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);

                if (!matches || matches.length !== 3) {
                    throw {
                        status: 401,
                        message:
                            'Invalid image format. Make sure it is Base64 encoded.',
                    };
                }

                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                if (buffer.length > 10 * 1024 * 1024) {
                    throw {
                        status: 401,
                        message: 'Image size is too large (max 10MB)',
                    };
                }

                const imageName =
                    randomImageName() + mimeType.replace('image/', '.');
                const imagePath = `images/${imageName}`;
                await Images3Client.uploadFile(buffer, mimeType, imagePath);

                post.image = imageName; // Assign new image to post object
            } else if (!image) {
                post.image = null; // Set image to null if none is provided
            }

            // Update post in DB
            await DB.execute(
                `UPDATE Post
                 SET title       = :title,
                     description = :description,
                     priority    = :priority,
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
                    image: post.image,
                }
            );

            await DB.execute(
                `UPDATE PostParent
                                SET push = 0
                                WHERE post_student_id IN (SELECT id
                                    FROM PostStudent
                                    WHERE post_id = :post_id)`,
                {
                    post_id: post.id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'Post edited successfully',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postGroupStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const groupId = req.params.group_id;
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }

            const studentId = req.params.student_id;
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }

            const studentAndGroupInfo = await DB.query(
                `SELECT st.id,
                                                               st.email,
                                                               st.phone_number,
                                                               st.given_name,
                                                               st.family_name,
                                                               st.student_number,
                                                               ps.id   AS post_student_id,
                                                               sg.id   AS group_id,
                                                               sg.name AS group_name
                                                        FROM PostStudent AS ps
                                                                 INNER JOIN Student AS st ON ps.student_id = st.id
                                                                 INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                                                        WHERE ps.student_id = :student_id
                                                          AND ps.post_id = :post_id
                                                          AND st.school_id = :school_id
                                                          AND ps.group_id = :group_id`,
                {
                    student_id: studentId,
                    post_id: postId,
                    school_id: req.user.school_id,
                    group_id: groupId,
                }
            );

            if (studentAndGroupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const student = {
                id: studentAndGroupInfo[0].id,
                email: studentAndGroupInfo[0].email,
                phone_number: studentAndGroupInfo[0].phone_number,
                given_name: studentAndGroupInfo[0].given_name,
                family_name: studentAndGroupInfo[0].family_name,
                student_number: studentAndGroupInfo[0].student_number,
            };
            const group = {
                id: studentAndGroupInfo[0].group_id,
                name: studentAndGroupInfo[0].group_name,
            };

            const postStudentId = studentAndGroupInfo[0].post_student_id;

            const parentsPost = await DB.query(
                `SELECT pa.id,
                                                       pa.email,
                                                       pa.phone_number,
                                                       pa.given_name,
                                                       pa.family_name,
                                                       ps.viewed_at
                                                FROM PostParent AS ps
                                                         INNER JOIN Parent AS pa
                                                                    ON ps.parent_id = pa.id
                                                WHERE ps.post_student_id = :post_student_id`,
                {
                    post_student_id: postStudentId,
                }
            );

            return res
                .status(200)
                .json({
                    group: group,
                    student: student,
                    parents: parentsPost,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postGroupStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const groupId = req.params.group_id;
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }

            const groupInfo = await DB.query(
                `
                SELECT sg.id,
                       sg.name,
                       ps.post_id
                FROM PostStudent AS ps
                         INNER JOIN StudentGroup AS sg
                                    on ps.group_id = sg.id
                WHERE ps.group_id = :group_id
                  AND ps.post_id = :post_id
                  AND sg.school_id = :school_id;`,
                {
                    group_id: groupId,
                    post_id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const group = groupInfo[0];

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const email = (req.query.email as string) || '';
            const student_number = (req.query.student_number as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: group.post_id,
                group_id: group.id,
            };

            if (email) {
                filters.push('st.email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('st.student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause =
                filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(
                `SELECT st.id,
                                                           st.email,
                                                           st.given_name,
                                                           st.family_name,
                                                           st.phone_number,
                                                           st.student_number,
                                                           ps.id AS post_student_id
                                                    FROM PostStudent AS ps
                                                             INNER JOIN Student AS st on ps.student_id = st.id
                                                    WHERE ps.post_id = :post_id
                                                      AND ps.group_id = :group_id
                                                      AND st.school_id = :school_id ${whereClause}
                LIMIT :limit
                                                    OFFSET :offset`,
                params
            );

            const totalStudents = (
                await DB.query(
                    `SELECT COUNT(DISTINCT st.id) AS total
                                                   FROM PostStudent AS ps
                                                            INNER JOIN Student AS st ON ps.student_id = st.id
                                                   WHERE ps.post_id = :post_id
                                                     AND st.school_id = :school_id
                                                     AND ps.group_id = :group_id ${whereClause};`,
                    params
                )
            )[0].total;
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            const postStudentIds = studentPostList.map(
                (student: any) => student.post_student_id
            );
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(
                    `SELECT pa.id,
                                                      pa.given_name,
                                                      pa.family_name,
                                                      pp.viewed_at,
                                                      pp.post_student_id
                                               FROM PostParent AS pp
                                                        INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                                               WHERE pp.post_student_id IN (:student_ids);`,
                    {
                        student_ids: postStudentIds,
                    }
                );
            } else {
                readStatuses = [];
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false,
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map(
                (student: any) => ({
                    ...student,
                    parents: readStatusMap.get(student.post_student_id) || [],
                })
            );

            return res
                .status(200)
                .json({
                    group: {
                        id: group.id,
                        name: group.name,
                    },
                    students: studentsWithReadStatus,
                    pagination: pagination,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const studentId = req.params.student_id;
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id',
                };
            }

            const studentInfo = await DB.query(
                `SELECT st.id,
                                                       st.email,
                                                       st.phone_number,
                                                       st.given_name,
                                                       st.family_name,
                                                       st.student_number,
                                                       ps.id AS post_student_id
                                                FROM PostStudent AS ps
                                                         INNER JOIN Student AS st on ps.student_id = st.id
                                                WHERE ps.student_id = :student_id
                                                  AND ps.post_id = :post_id
                                                  AND st.school_id = :school_id`,
                {
                    student_id: studentId,
                    post_id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const student = studentInfo[0];
            const postStudentId = student.post_student_id;

            const parentsPost = await DB.query(
                `SELECT pa.id,
                                                       pa.email,
                                                       pa.phone_number,
                                                       pa.given_name,
                                                       pa.family_name,
                                                       ps.viewed_at
                                                FROM PostParent AS ps
                                                         INNER JOIN Parent AS pa
                                                                    ON ps.parent_id = pa.id
                                                WHERE ps.post_student_id = :post_student_id`,
                {
                    post_student_id: postStudentId,
                }
            );

            return res
                .status(200)
                .json({
                    student: {
                        id: student.id,
                        email: student.email,
                        phone_number: student.phone_number,
                        given_name: student.given_name,
                        family_name: student.family_name,
                        student_number: student.student_number,
                    },
                    parents: parentsPost,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postViewGroups = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const postInfo = await DB.query(
                `SELECT *
                                             FROM Post
                                             WHERE id = :id
                                               AND school_id = :school_id`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const name = (req.query.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id,
            };

            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const groupsPostList = await DB.query(
                `SELECT sg.id,
                                                          sg.name,
                                                          COUNT(DISTINCT CASE
                                                                             WHEN pp.viewed_at IS NOT NULL
                                                                                 THEN CONCAT(pp.parent_id, '-', ps.student_id) END) AS viewed_count,
                                                          COUNT(DISTINCT CASE
                                                                             WHEN pp.viewed_at IS NULL
                                                                                 THEN CONCAT(pp.parent_id, '-', ps.student_id) END) AS not_viewed_count
                                                   FROM PostStudent AS ps
                                                            INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                                                            LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                                                   WHERE ps.post_id = :post_id
                                                     AND ps.group_id IS NOT NULL
                                                     AND sg.school_id = :school_id ${whereClause}
                                                   GROUP BY sg.id, sg.name
                                                       LIMIT :limit
                                                   OFFSET :offset;`,
                params
            );

            const totalGroups = (
                await DB.query(
                    `SELECT COUNT(DISTINCT sg.id) AS total
                                                 FROM PostStudent AS ps
                                                          INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                                                 WHERE ps.post_id = :post_id
                                                   AND ps.group_id IS NOT NULL
                                                   AND sg.school_id = :school_id ${whereClause};`,
                    params
                )
            )[0].total;
            const totalPages = Math.ceil(totalGroups / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_groups: totalGroups,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            return res
                .status(200)
                .json({
                    groups: groupsPostList,
                    pagination: pagination,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postViewStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }

            const postInfo = await DB.query(
                `SELECT *
                                             FROM Post
                                             WHERE id = :id
                                               AND school_id = :school_id`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');

            const offset = (page - 1) * limit;

            const email = (req.query.email as string) || '';
            const student_number = (req.query.student_number as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id,
            };

            if (email) {
                filters.push('email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause =
                filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(
                `SELECT st.id,
                                                           st.email,
                                                           st.given_name,
                                                           st.family_name,
                                                           st.phone_number,
                                                           st.student_number,
                                                           ps.id AS post_student_id
                                                    FROM PostStudent AS ps
                                                             INNER JOIN Student AS st on ps.student_id = st.id
                                                    WHERE ps.post_id = :post_id
                                                      AND ps.group_id IS NULL ${whereClause}
                LIMIT :limit
                                                    OFFSET :offset`,
                params
            );

            const totalStudents = (
                await DB.query(
                    `SELECT COUNT(DISTINCT st.id) AS total
                                                   FROM PostStudent AS ps
                                                            INNER JOIN Student AS st ON ps.student_id = st.id
                                                   WHERE ps.post_id = :post_id ${whereClause};`,
                    params
                )
            )[0].total;
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            const postStudentIds = studentPostList.map(
                (student: any) => student.post_student_id
            );
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(
                    `SELECT pa.id,
                                                      pa.given_name,
                                                      pa.family_name,
                                                      pp.viewed_at,
                                                      pp.post_student_id
                                               FROM PostParent AS pp
                                                        INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                                               WHERE pp.post_student_id IN (:student_ids);`,
                    {
                        student_ids: postStudentIds,
                    }
                );
            } else {
                readStatuses = [];
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false,
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map(
                (student: any) => ({
                    ...student,
                    parents: readStatusMap.get(student.post_student_id) || [],
                })
            );

            return res
                .status(200)
                .json({
                    students: studentsWithReadStatus,
                    pagination: pagination,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postView = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id',
                };
            }
            const postInfo = await DB.query(
                `SELECT po.id,
                                                    po.title,
                                                    po.description,
                                                    po.priority,
                                                    po.sent_at,
                                                    po.edited_at,
                                                    po.image,
                                                    ad.id                                                                    AS admin_id,
                                                    ad.given_name,
                                                    ad.family_name,
                                                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN pp.parent_id END) AS read_count,
                                                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.parent_id END)     AS unread_count
                                             FROM Post AS po
                                                      INNER JOIN Admin AS ad ON po.admin_id = ad.id
                                                      LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                                                      LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                                             WHERE po.id = :id
                                               AND po.school_id = :school_id
                                             GROUP BY po.id, ad.id, ad.given_name, ad.family_name`,
                {
                    id: postId,
                    school_id: req.user.school_id,
                }
            );

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found',
                };
            }

            const post = postInfo[0];

            return res
                .status(200)
                .json({
                    post: {
                        id: post.id,
                        title: post.title,
                        description: post.description,
                        image: post.image,
                        priority: post.priority,
                        sent_at: post.sent_at,
                        edited_at: post.edited_at,
                        read_count: post.read_count,
                        unread_count: post.unread_count,
                    },
                    admin: {
                        id: post.admin_id,
                        given_name: post.given_name,
                        family_name: post.family_name,
                    },
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    postList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const perPageQuery = parseInt(req.query.perPage as string);
            const limit =
                perPageQuery && [10, 30, 50, 100].includes(perPageQuery)
                    ? perPageQuery
                    : parseInt(process.env.PER_PAGE + '') || 10;
            const offset = (page - 1) * limit;

            const priority = (req.query.priority as string) || '';
            const text = (req.query.text as string) || '';

            const filters: string[] = ['po.school_id = :school_id'];
            const params: any = {
                school_id: req.user.school_id,
                limit,
                offset,
            };

            if (priority && isValidPriority(priority)) {
                filters.push('po.priority = :priority');
                params.priority = priority;
            }
            if (text) {
                filters.push(
                    '(po.title LIKE :text OR po.description LIKE :text)'
                );
                params.text = `%${text}%`;
            }

            const whereClause = 'WHERE ' + filters.join(' AND ');

            const postList = await DB.query(
                `
                SELECT po.id,
                       po.title,
                       po.description,
                       po.priority,
                       ad.id          AS admin_id,
                       ad.given_name  AS admin_given_name,
                       ad.family_name AS admin_family_name,
                       po.sent_at,
                       po.edited_at,
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
                LIMIT :limit OFFSET :offset
            `,
                params
            );

            const totalPostsResult = await DB.query(
                `
                SELECT COUNT(*) AS total FROM (
                    SELECT DISTINCT po.id
                    FROM Post AS po
                    INNER JOIN Admin AS ad ON ad.id = po.admin_id
                    LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                    LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                    ${whereClause}
                ) AS subquery
            `,
                params
            );
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
                links: generatePaginationLinks(page, totalPages),
            };

            const formattedPostList = postList.map(
                ({
                    id,
                    title,
                    description,
                    priority,
                    sent_at,
                    edited_at,
                    read_percent,
                    admin_id,
                    admin_given_name,
                    admin_family_name,
                }: any) => ({
                    id,
                    title,
                    description,
                    priority,
                    sent_at,
                    edited_at,
                    read_percent,
                    admin: {
                        id: admin_id,
                        given_name: admin_given_name,
                        family_name: admin_family_name,
                    },
                })
            );

            return res
                .status(200)
                .json({
                    posts: formattedPostList,
                    pagination,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    createPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const { title, description, priority, students, groups, image } =
                req.body;

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_title',
                };
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_description',
                };
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_priority',
                };
            }

            let postInsert;
            if (image) {
                const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    throw {
                        status: 401,
                        message: 'invalid_image_format',
                    };
                }
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.length > 1024 * 1024 * 10) {
                    throw {
                        status: 401,
                        message: 'image_size_too_large',
                    };
                }

                const imageName =
                    randomImageName() + mimeType.replace('image/', '.');
                const imagePath = 'images/' + imageName;
                await Images3Client.uploadFile(buffer, mimeType, imagePath);

                postInsert = await DB.execute(
                    `
                INSERT INTO Post (title, description, priority, admin_id, image, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :image, :school_id);`,
                    {
                        title: title,
                        description: description,
                        priority: priority,
                        admin_id: req.user.id,
                        image: imageName,
                        school_id: req.user.school_id,
                    }
                );
            } else {
                postInsert = await DB.execute(
                    `
                INSERT INTO Post (title, description, priority, admin_id, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :school_id);`,
                    {
                        title: title,
                        description: description,
                        priority: priority,
                        admin_id: req.user.id,
                        school_id: req.user.school_id,
                    }
                );
            }

            const postId = postInsert.insertId;

            if (
                students &&
                Array.isArray(students) &&
                isValidStringArrayId(students) &&
                students.length > 0
            ) {
                const studentList = await DB.query(
                    `SELECT st.id
                     FROM Student AS st
                     WHERE st.id IN (:students)`,
                    { students }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id) VALUE (:post_id, :student_id)`,
                            {
                                post_id: postId,
                                student_id: student.id,
                            }
                        );

                        const studentAttachList = await DB.query(
                            `SELECT sp.parent_id
                                                                  FROM StudentParent AS sp
                                                                  WHERE sp.student_id = :student_id`,
                            {
                                student_id: student.id,
                            }
                        );

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList
                                .map(
                                    (student: any) =>
                                        `(${post_student.insertId}, ${student.parent_id})`
                                )
                                .join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id)
                                              VALUES ${studentValues}`);
                        }
                    }
                }
            }
            if (
                groups &&
                Array.isArray(groups) &&
                isValidArrayId(groups) &&
                groups.length > 0
            ) {
                const studentList = await DB.query(
                    `SELECT gm.student_id, gm.group_id
                     FROM GroupMember AS gm
                              RIGHT JOIN StudentGroup sg on gm.group_id = sg.id
                     WHERE group_id IN (:groups)
                       AND sg.school_id = :school_id`,
                    {
                        groups: groups,
                        school_id: req.user.school_id,
                    }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id, group_id) VALUE (:post_id, :student_id, :group_id)`,
                            {
                                post_id: postId,
                                student_id: student.student_id,
                                group_id: student.group_id,
                            }
                        );

                        const studentAttachList = await DB.query(
                            `SELECT sp.parent_id
                                                                  FROM StudentParent AS sp
                                                                  WHERE sp.student_id = :student_id`,
                            {
                                student_id: student.student_id,
                            }
                        );

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList
                                .map(
                                    (student: any) =>
                                        `(${post_student.insertId}, ${student.parent_id})`
                                )
                                .join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id)
                                              VALUES ${studentValues}`);
                        }
                    }
                }
            }

            return res
                .status(200)
                .json({
                    post: {
                        id: postId,
                        title: title,
                        description: description,
                        priority: priority,
                    },
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                console.log('Error occurred while creating post:', e);
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    downloadCSVTemplate = async (req: ExtendedRequest, res: Response) => {
        try {
            const headers = [
                'title',
                'description',
                'priority',
                'group_names',
                'student_numbers',
            ];

            stringify([headers], (err, output) => {
                if (err) {
                    console.error('CSV generation error:', err);
                    return res
                        .status(500)
                        .json({ error: 'csv_generation_error' });
                }

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader(
                    'Content-Disposition',
                    'attachment; filename="message_template.csv"'
                );

                const bom = '\uFEFF';
                res.send(bom + output);
            });
        } catch (e: any) {
            console.error('Error generating CSV template:', e);
            return res.status(500).json({ error: 'internal_server_error' });
        }
    };
}

export default PostController;
