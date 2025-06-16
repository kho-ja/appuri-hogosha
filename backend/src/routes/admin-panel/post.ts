import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth'
import express, { Response, Router } from "express";
import DB from '../../utils/db-client'
import { Images3Client } from '../../utils/s3-client'
import {
    isValidString,
    isValidArrayId,
    isValidPriority, isValidId, isValidStringArrayId,
    isValidStudentNumber
} from '../../utils/validate'
import process from "node:process";
import { generatePaginationLinks, randomImageName } from "../../utils/helper";
import multer from "multer";
import iconv from "iconv-lite";
import { Readable } from 'node:stream';
import csvParser from 'csv-parser';
import { stringify } from "csv-stringify";

const storage = multer.memoryStorage();
const upload = multer({ storage });

class PostController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes()
    }


    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createPost)
        this.router.get('/list', verifyToken, this.postList)
        this.router.post("/upload", verifyToken, upload.single("file"), this.uploadPostsFromCSV);

        this.router.get('/:id', verifyToken, this.postView)
        this.router.put('/:id', verifyToken, this.postUpdate)
        this.router.put('/:id/sender', verifyToken, this.postUpdateSender)
        this.router.delete('/:id', verifyToken, this.postDelete)
        this.router.post('/delete-multiple', verifyToken, this.deleteMultiplePosts);


        this.router.get('/:id/students', verifyToken, this.postViewStudents)
        this.router.get('/:id/student/:student_id', verifyToken, this.postStudentParent)

        this.router.get('/:id/groups', verifyToken, this.postViewGroups)
        this.router.get('/:id/group/:group_id', verifyToken, this.postGroupStudents)
        this.router.get('/:id/group/:group_id/student/:student_id', verifyToken, this.postGroupStudentParent)

        this.router.post('/:id/groups/:group_id', verifyToken, this.groupRetryPush)
        this.router.post('/:id/students/:student_id', verifyToken, this.studentRetryPush)
        this.router.post('/:id/parents/:parent_id', verifyToken, this.parentRetryPush)
    }

    uploadPostsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, withCSV } = req.body;
        const throwInErrorBool = throwInError === 'true';
        const withCSVBool = withCSV === 'true';

        const results: any[] = [];
        const errors: any[] = [];
        const inserted: any[] = [];

        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({
                    error: 'Bad Request',
                    details: 'File is missing or invalid'
                }).end();
            }

            const decodedContent = await iconv.decode(req.file.buffer, 'UTF-8');
            const stream = Readable.from(decodedContent)

            await new Promise((resolve, reject) => {
                stream
                    .pipe(csvParser())
                    .on('headers', (headers: any) => {
                        if (headers.length > 0 && headers[0].charCodeAt(0) === 0xFEFF) {
                            headers[0] = headers[0].slice(1);
                        }
                        headers = headers.map((header: string) => header.trim());
                    })
                    .on('data', (data: any) => {
                        if (Object.values(data).some((value: any) => value.trim() !== '')) {
                            results.push(data);
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            const validResults: any[] = [];
            const existingTitlesInCSV: any = [];

            for (const row of results) {
                const { title, description, priority, group_names, student_numbers } = row;
                const rowErrors: any = {};

                // Normalize fields
                const normalizedTitle = String(title).trim();
                const normalizedDescription = String(description).trim();
                const normalizedPriority = String(priority).trim();
                const normalizedGroupNames = String(group_names).trim();
                const normalizedStudentNumbers = String(student_numbers).trim();

                // Split comma-separated values into arrays
                const groupNamesArray = normalizedGroupNames.split(',').map(g => g.trim()).filter(Boolean);
                const studentNumbersArray = normalizedStudentNumbers.split(',').map(s => s.trim()).filter(Boolean);

                // Validate fields (assuming these helper functions exist)
                if (!isValidString(normalizedTitle)) rowErrors.title = "invalid_title";
                if (!isValidString(normalizedDescription)) rowErrors.description = "invalid_description";
                if (!isValidPriority(normalizedPriority)) rowErrors.priority = "invalid_priority";

                // Validate each group name
                for (const gn of groupNamesArray) {
                    if (!isValidString(gn)) rowErrors.group_names = "invalid_group_names";
                }

                // Validate each student number
                for (const sn of studentNumbersArray) {
                    if (!isValidStudentNumber(sn)) rowErrors.student_numbers = "invalid_student_numbers";
                }

                if (Object.keys(rowErrors).length > 0) {
                    handleInvalidPost(
                        row,
                        rowErrors,
                        normalizedTitle,
                        normalizedDescription,
                        normalizedPriority,
                        groupNamesArray,
                        studentNumbersArray
                    );
                    continue;
                }

                handleValidPost(
                    row,
                    normalizedTitle,
                    normalizedDescription,
                    normalizedPriority,
                    groupNamesArray,
                    studentNumbersArray
                );
            }

            function handleInvalidPost(
                row: any,
                rowErrors: any,
                title: string,
                description: string,
                priority: string,
                groupNamesArray: string[],
                studentNumbersArray: string[]
            ) {
                // Find an existing valid post by matching title, description, and priority
                const existingPost = validResults.find(
                    post =>
                        post.title === title &&
                        post.description === description &&
                        post.priority === priority
                );

                if (existingPost && !rowErrors.student_numbers && !rowErrors.group_names) {
                    // Merge arrays into existing post
                    existingPost.student_numbers.push(...studentNumbersArray);
                    existingPost.group_names.push(...groupNamesArray);
                } else if (isCompletelyInvalidExceptArrays(rowErrors)) {
                    // If only the arrays are valid, merge into the last valid post
                    validResults.at(-1).student_numbers.push(...studentNumbersArray);
                    validResults.at(-1).group_names.push(...groupNamesArray);
                } else {
                    addErrorPost(row, rowErrors, groupNamesArray, studentNumbersArray);
                }
            }

            function handleValidPost(
                row: any,
                title: string,
                description: string,
                priority: string,
                groupNamesArray: string[],
                studentNumbersArray: string[]
            ) {
                const existingPost = validResults.find(
                    post =>
                        post.title === title &&
                        post.description === description &&
                        post.priority === priority
                );

                if (existingPost) {
                    existingPost.student_numbers.push(...studentNumbersArray);
                    existingPost.group_names.push(...groupNamesArray);
                } else {
                    validResults.push({
                        title,
                        description,
                        priority,
                        group_names: groupNamesArray,
                        student_numbers: studentNumbersArray,
                    });
                    existingTitlesInCSV.push(title);
                }
            }

            // Checks if only the array fields (group_names and student_numbers) are valid
            function isCompletelyInvalidExceptArrays(errors: any) {
                return (
                    errors.title &&
                    errors.description &&
                    errors.priority ||
                    (!errors.group_names ||
                        !errors.student_numbers)
                );
            }

            function addErrorPost(
                row: any,
                rowErrors: any,
                groupNamesArray: string[],
                studentNumbersArray: string[]
            ) {
                let existingError = errors.find(
                    err =>
                        err.row.title === row.title &&
                        err.row.description === row.description &&
                        err.row.priority === row.priority
                );
                if (existingError) {
                    existingError.row.student_numbers.push(...studentNumbersArray);
                    existingError.row.group_names.push(...groupNamesArray);
                } else {
                    errors.push({
                        row: { ...row, student_numbers: studentNumbersArray, group_names: groupNamesArray },
                        errors: { ...rowErrors },
                    });
                }
            }

            // delete duplicate group_names and student_numbers
            for (const post of validResults) {
                post.group_names = Array.from(new Set(post.group_names));
                post.student_numbers = Array.from(new Set(post.student_numbers));
            }

            if (errors.length > 0 && throwInErrorBool) {
                return res.status(400).json({ errors }).end();
            }

            // add messages to database
            for (const post of validResults) {
                const postInsert = await DB.execute(`
                INSERT INTO Post (title, description, priority, admin_id, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :school_id);`, {
                    title: post.title,
                    description: post.description,
                    priority: post.priority,
                    admin_id: req.user.id,
                    school_id: req.user.school_id,
                });

                const postId = postInsert.insertId;

                const attachedStudents: any[] = [];
                if (post.student_numbers && Array.isArray(post.student_numbers) && post.student_numbers.length > 0) {
                    const studentRows = await DB.query(`SELECT id
                        FROM Student WHERE student_number IN (:student_numbers)
                        GROUP BY student_number`, {
                        student_numbers: post.student_numbers
                    })
                    const studentsToAdd = studentRows.map((e: any) => e.id);

                    for (const studentId of studentsToAdd) {
                        const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id) VALUES (:post_id, :student_id)`, {
                            post_id: postId,
                            student_id: studentId
                        });

                        const studentParents = await DB.query(`SELECT parent_id FROM StudentParent WHERE student_id = :student_id`, {
                            student_id: studentId
                        });
                        if (studentParents.length > 0) {
                            const studentParentValues = studentParents.map((sp: any) => `(${post_student.insertId}, ${sp.parent_id})`);
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentParentValues.join(',')}`);
                        }
                    }

                    attachedStudents.push(studentRows)
                }

                const attachedGroups: any[] = [];
                if (post.group_names && Array.isArray(post.group_names) && post.group_names.length > 0) {
                    const groupsList = await DB.query(`SELECT id FROM StudentGroup WHERE name IN (:group_names)`, {
                        group_names: post.group_names,
                    })
                    const groupsToAdd = groupsList.map((e: any) => e.id)

                    for (const groupId of groupsToAdd) {
                        const groupMembers = await DB.query(
                            `SELECT student_id FROM GroupMember WHERE group_id = :group_id`,
                            {
                                group_id: groupId,
                            }
                        );

                        if (groupMembers.length <= 0) {
                            throw {
                                status: 404,
                                message: "group_members_not_found",
                            };
                        }

                        for (const member of groupMembers) {
                            const post_student = await DB.execute(
                                `INSERT INTO PostStudent (post_id, student_id, group_id) VALUES (:post_id, :student_id, :group_id)`,
                                {
                                    post_id: postId,
                                    student_id: member.student_id,
                                    group_id: groupId,
                                }
                            );
                            const studentParents = await DB.query(
                                `SELECT parent_id FROM StudentParent WHERE student_id = :student_id`,
                                {
                                    student_id: member.student_id,
                                }
                            );
                            if (studentParents.length > 0) {
                                const studentParentValues = studentParents.map(
                                    (sp: any) => `(${post_student.insertId}, ${sp.parent_id})`
                                );
                                await DB.execute(
                                    `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentParentValues.join(
                                        ","
                                    )}`
                                );
                            }
                        }

                    }
                }

                inserted.push({ ...post, student_numbers: attachedStudents.map(e => e.student_number), group_names: attachedGroups });
            }

            if (errors.length > 0) {
                let csvFile: Buffer | null = null;

                if (withCSVBool) {
                    const csvData = errors.map((error) => ({
                        title: error?.row?.title,
                        description: error?.row?.description,
                        priority: error?.row?.priority,
                        student_numbers: Array.isArray(error?.row?.student_numbers) ? error?.row?.student_numbers?.join(', ') : error?.row?.student_numbers,
                        group_names: Array.isArray(error?.row?.group_names) ? error?.row?.group_names?.join(', ') : error?.row?.group_names,
                    }));
                    const csvContent = stringify(csvData, {
                        header: true,
                        columns: ['title', 'description', 'priority', 'student_numbers', 'group_names']
                    });
                    // response headers for sending multipart files to send it with json response
                    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                    res.setHeader('Content-Disposition', 'attachment; filename=errors.csv');

                    csvFile = Buffer.from('\uFEFF' + csvContent, 'utf-8');
                }


                return res.status(400).json({
                    message: 'csv_processed_with_errors',
                    inserted: inserted,
                    errors: errors,
                    results: validResults,
                    csvFile: csvFile,
                }).end()
            }

            return res.status(200).json({
                message: 'csv_processed_successfully',
                inserted: inserted,
                results: validResults,
            }).end()
        } catch (e: any) {
            return res.status(500).json({
                error: 'internal_server_error',
                details: e.message
            }).end();
        }
    };


    postUpdateSender = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }


            const postInfo = await DB.query(`SELECT id
                                             FROM Post
                                             WHERE id = :id
                                               AND school_id = :school_id`, {
                id: postId,
                school_id: req.user.school_id
            });
            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }


            const { students, groups } = req.body

            const existingPostStudents = await DB.query(`SELECT id, student_id, group_id
                                                     FROM PostStudent
                                                     WHERE post_id = :post_id`, {
                post_id: postId
            });

            const existingStudentIds = existingPostStudents.map((ps: any) => ps.student_id);
            const existingGroupIds = existingPostStudents.map((ps: any) => ps.group_id);

            const studentsToAdd = students.filter((id: any) => !existingStudentIds.includes(id));
            const groupsToAdd = groups.filter((id: any) => !existingGroupIds.includes(id));

            const studentsToRemove = existingPostStudents.filter((ps: any) => ps.student_id && !students.includes(ps.student_id));
            const groupsToRemove = existingPostStudents.filter((ps: any) => ps.group_id && !groups.includes(ps.group_id));

            if (studentsToRemove.length > 0) {
                const studentConditions = studentsToRemove.map((ps: any) => `id = ${ps.id}`).join(' OR ');
                await DB.execute(`DELETE FROM PostStudent WHERE ${studentConditions}`);
                await DB.execute(`DELETE FROM PostParent WHERE ${studentConditions}`);
            }

            if (groupsToRemove.length > 0) {
                const groupConditions = groupsToRemove.map((ps: any) => `id = ${ps.id}`).join(' OR ');
                await DB.execute(`DELETE FROM PostStudent WHERE ${groupConditions}`);
                await DB.execute(`DELETE FROM PostParent WHERE ${groupConditions}`);
            }

            for (const studentId of studentsToAdd) {
                const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id) VALUES (:post_id, :student_id)`, {
                    post_id: postId,
                    student_id: studentId
                });

                const studentParents = await DB.query(`SELECT parent_id FROM StudentParent WHERE student_id = :student_id`, {
                    student_id: studentId
                });
                if (studentParents.length > 0) {
                    const studentParentValues = studentParents.map((sp: any) => `(${post_student.insertId}, ${sp.parent_id})`);
                    await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentParentValues.join(',')}`);
                }
            }

            for (const groupId of groupsToAdd) {
                const groupMembers = await DB.query(`SELECT student_id FROM GroupMember WHERE group_id = :group_id`, {
                    group_id: groupId
                });

                if (groupMembers.length <= 0) {
                    throw {
                        status: 404,
                        message: 'group_members_not_found'
                    }
                }

                for (const member of groupMembers) {
                    const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id, group_id) VALUES (:post_id, :student_id, :group_id)`, {
                        post_id: postId,
                        student_id: member.student_id,
                        group_id: groupId
                    });
                    const studentParents = await DB.query(`SELECT parent_id FROM StudentParent WHERE student_id = :student_id`, {
                        student_id: member.student_id
                    })
                    if (studentParents.length > 0) {
                        const studentParentValues = studentParents.map((sp: any) => `(${post_student.insertId}, ${sp.parent_id})`);
                        await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentParentValues.join(',')}`);
                    }
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE Post
                              SET edited_at = NOW()
                              WHERE id = :id
                                AND school_id = :school_id`, {
                id: post.id,
                school_id: req.user.school_id,
            });

            return res.status(200).json({
                message: 'post_sender_updated_successfully'
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

    groupRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const groupId = req.params.group_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id'
                }
            }


            const postInfo = await DB.query(`SELECT po.id, ps.group_id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                             WHERE ps.post_id = :post_id
                                               AND ps.group_id = :group_id
                                               AND po.school_id = :school_id`, {
                post_id: postId,
                group_id: groupId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id
                                                          AND group_id = :group_id)
                                AND viewed_at IS NULL`, {
                post_id: post.id,
                group_id: post.group_id,
            })

            return res.status(200).json({
                message: 'notificationReSent'
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

    studentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const student_id = req.params.student_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }
            if (!student_id || !isValidId(student_id)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id'
                }
            }


            const postInfo = await DB.query(`SELECT po.id, ps.student_id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                             WHERE ps.post_id = :post_id
                                               AND ps.student_id = :student_id
                                               AND po.school_id = :school_id`, {
                post_id: postId,
                student_id: student_id,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id
                                                          AND student_id = :student_id)
                                AND viewed_at IS NULL`, {
                post_id: post.id,
                student_id: post.student_id,
            })

            return res.status(200).json({
                message: 'notificationReSent'
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

    parentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const parent_id = req.params.parent_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }
            if (!parent_id || !isValidId(parent_id)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_parent_id'
                }
            }


            const postInfo = await DB.query(`SELECT pp.parent_id,
                                                    po.id
                                             FROM PostStudent AS ps
                                                      INNER JOIN Post AS po ON
                                                 po.id = ps.post_id
                                                      INNER JOIN PostParent AS pp ON
                                                 ps.id = pp.post_student_id
                                             WHERE ps.post_id = :post_id
                                               AND po.school_id = :school_id
                                               AND pp.parent_id = :parent_id`, {
                post_id: postId,
                parent_id: parent_id,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                              SET push = 0
                              WHERE post_student_id IN (SELECT id
                                                        FROM PostStudent
                                                        WHERE post_id = :post_id)
                                AND parent_id = parent_id
                                AND viewed_at IS NULL`, {
                post_id: post.id,
                parent_id: post.parent_id,
            })

            return res.status(200).json({
                message: 'notificationReSent'
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

    postDelete = async (req: ExtendedRequest, res: Response) => {
        try {
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
                                                    image
                                             FROM Post
                                             WHERE school_id = :school_id
                                               AND id = :id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {

                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            Images3Client.deleteFile('images/' + postInfo[0].image)

            await DB.execute('DELETE FROM Post WHERE id = :id;', {
                id: postId,
            })

            return res.status(200).json({
                message: 'postDeleted'
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

    deleteMultiplePosts = async (req: ExtendedRequest, res: Response) => {
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
            FROM Post
            WHERE school_id = ?
              AND id IN (${placeholders})
        `, [req.user.school_id, ...postIds]);

            if (postsInfo.length === 0) {
                throw {
                    status: 404,
                    message: 'No posts found'
                };
            }

            for (const post of postsInfo) {
                if (post.image) {
                    await Images3Client.deleteFile('images/' + post.image);
                }
            }

            await DB.execute(`
            DELETE FROM Post
            WHERE school_id = ?  
              AND id IN (${placeholders})  
        `, [req.user.school_id, ...postIds]); 

            return res.status(200).json({
                message: 'postsDeleted',
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
    };

    postUpdate = async (req: ExtendedRequest, res: Response) => {
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
                image,
            } = req.body

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
                                                    image
                                             FROM Post
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

            await DB.execute(`UPDATE PostParent
                                SET push = 0
                                WHERE post_student_id IN (SELECT id
                                    FROM PostStudent
                                    WHERE post_id = :post_id)`, {
                post_id: post.id
            })

            return res.status(200).json({
                message: 'Post edited successfully'
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

    postGroupStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const groupId = req.params.group_id
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id'
                }
            }

            const studentId = req.params.student_id
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id'
                }

            }

            const studentAndGroupInfo = await DB.query(`SELECT st.id,
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
                                                          AND ps.group_id = :group_id`, {
                student_id: studentId,
                post_id: postId,
                school_id: req.user.school_id,
                group_id: groupId
            });

            if (studentAndGroupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const student = {
                id: studentAndGroupInfo[0].id,
                email: studentAndGroupInfo[0].email,
                phone_number: studentAndGroupInfo[0].phone_number,
                given_name: studentAndGroupInfo[0].given_name,
                family_name: studentAndGroupInfo[0].family_name,
                student_number: studentAndGroupInfo[0].student_number,
            }
            const group = {
                id: studentAndGroupInfo[0].group_id,
                name: studentAndGroupInfo[0].group_name,
            }

            const postStudentId = studentAndGroupInfo[0].post_student_id

            const parentsPost = await DB.query(`SELECT pa.id,
                                                       pa.email,
                                                       pa.phone_number,
                                                       pa.given_name,
                                                       pa.family_name,
                                                       ps.viewed_at
                                                FROM PostParent AS ps
                                                         INNER JOIN Parent AS pa
                                                                    ON ps.parent_id = pa.id
                                                WHERE ps.post_student_id = :post_student_id`, {
                post_student_id: postStudentId
            });


            return res.status(200).json({
                group: group,
                student: student,
                parents: parentsPost,
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

    postGroupStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const groupId = req.params.group_id
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id'
                }
            }

            const groupInfo = await DB.query(`
                SELECT sg.id,
                       sg.name,
                       ps.post_id
                FROM PostStudent AS ps
                         INNER JOIN StudentGroup AS sg
                                    on ps.group_id = sg.id
                WHERE ps.group_id = :group_id
                  AND ps.post_id = :post_id
                  AND sg.school_id = :school_id;`, {
                group_id: groupId,
                post_id: postId,
                school_id: req.user.school_id
            });

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const group = groupInfo[0];


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const email = req.query.email as string || '';
            const student_number = req.query.student_number as string || '';

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

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(`SELECT st.id,
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
                                                    OFFSET :offset`, params);

            const totalStudents = (await DB.query(`SELECT COUNT(DISTINCT st.id) AS total
                                                   FROM PostStudent AS ps
                                                            INNER JOIN Student AS st ON ps.student_id = st.id
                                                   WHERE ps.post_id = :post_id
                                                     AND st.school_id = :school_id
                                                     AND ps.group_id = :group_id ${whereClause};`, params))[0].total
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const postStudentIds = studentPostList.map((student: any) => student.post_student_id);
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(`SELECT pa.id,
                                                      pa.given_name,
                                                      pa.family_name,
                                                      pp.viewed_at,
                                                      pp.post_student_id
                                               FROM PostParent AS pp
                                                        INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                                               WHERE pp.post_student_id IN (:student_ids);`, {
                    student_ids: postStudentIds
                });
            } else {
                readStatuses = []
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map((student: any) => ({
                ...student,
                parents: readStatusMap.get(student.post_student_id) || []
            }));


            return res.status(200).json({
                group: {
                    id: group.id,
                    name: group.name
                },
                students: studentsWithReadStatus,
                pagination: pagination
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

    postStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const studentId = req.params.student_id
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_student_id'
                }
            }

            const studentInfo = await DB.query(`SELECT st.id,
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
                                                  AND st.school_id = :school_id`, {
                student_id: studentId,
                post_id: postId,
                school_id: req.user.school_id
            });

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'post_not_found'
                }
            }

            const student = studentInfo[0];
            const postStudentId = student.post_student_id

            const parentsPost = await DB.query(`SELECT pa.id,
                                                       pa.email,
                                                       pa.phone_number,
                                                       pa.given_name,
                                                       pa.family_name,
                                                       ps.viewed_at
                                                FROM PostParent AS ps
                                                         INNER JOIN Parent AS pa
                                                                    ON ps.parent_id = pa.id
                                                WHERE ps.post_student_id = :post_student_id`, {
                post_student_id: postStudentId
            });


            return res.status(200).json({
                student: {
                    id: student.id,
                    email: student.email,
                    phone_number: student.phone_number,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number
                },
                parents: parentsPost
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

    postViewGroups = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const postInfo = await DB.query(`SELECT *
                                             FROM Post
                                             WHERE id = :id
                                               AND school_id = :school_id`, {
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


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const name = req.query.name as string || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id
            };


            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const groupsPostList = await DB.query(`SELECT sg.id,
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
                                                   OFFSET :offset;`, params);

            const totalGroups = (await DB.query(`SELECT COUNT(DISTINCT sg.id) AS total
                                                 FROM PostStudent AS ps
                                                          INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                                                 WHERE ps.post_id = :post_id
                                                   AND ps.group_id IS NOT NULL
                                                   AND sg.school_id = :school_id ${whereClause};`,
                params))[0].total
            const totalPages = Math.ceil(totalGroups / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_groups: totalGroups,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };


            return res.status(200).json({
                groups: groupsPostList,
                pagination: pagination
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

    postViewStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }

            const postInfo = await DB.query(`SELECT *
                                             FROM Post
                                             WHERE id = :id
                                               AND school_id = :school_id`, {
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


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');

            const offset = (page - 1) * limit;

            const email = req.query.email as string || '';
            const student_number = req.query.student_number as string || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id
            };


            if (email) {
                filters.push('email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(`SELECT st.id,
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
                                                    OFFSET :offset`, params);

            const totalStudents = (await DB.query(`SELECT COUNT(DISTINCT st.id) AS total
                                                   FROM PostStudent AS ps
                                                            INNER JOIN Student AS st ON ps.student_id = st.id
                                                   WHERE ps.post_id = :post_id ${whereClause};`, params))[0].total
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const postStudentIds = studentPostList.map((student: any) => student.post_student_id);
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(`SELECT pa.id,
                                                      pa.given_name,
                                                      pa.family_name,
                                                      pp.viewed_at,
                                                      pp.post_student_id
                                               FROM PostParent AS pp
                                                        INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                                               WHERE pp.post_student_id IN (:student_ids);`, {
                    student_ids: postStudentIds
                });
            } else {
                readStatuses = []
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map((student: any) => ({
                ...student,
                parents: readStatusMap.get(student.post_student_id) || []
            }));


            return res.status(200).json({
                students: studentsWithReadStatus,
                pagination: pagination
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

    postView = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_post_id'
                }
            }
            const postInfo = await DB.query(`SELECT po.id,
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
                                             GROUP BY po.id, ad.id, ad.given_name, ad.family_name`, {
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

            return res.status(200).json({
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

    postList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const perPageQuery = parseInt(req.query.perPage as string);
            const limit = (perPageQuery && [10, 30, 50, 100].includes(perPageQuery))
                ? perPageQuery
                : parseInt(process.env.PER_PAGE + '') || 10;
            const offset = (page - 1) * limit;

            const priority = req.query.priority as string || '';
            const text = req.query.text as string || '';

            const filters: string[] = ['po.school_id = :school_id'];
            const params: any = {
                school_id: req.user.school_id,
                limit,
                offset
            };

            if (priority && isValidPriority(priority)) {
                filters.push('po.priority = :priority');
                params.priority = priority;
            }
            if (text) {
                filters.push('(po.title LIKE :text OR po.description LIKE :text)');
                params.text = `%${text}%`;
            }

            const whereClause = 'WHERE ' + filters.join(' AND ');

            const postList = await DB.query(`
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
            `, params);

            const totalPostsResult = await DB.query(`
                SELECT COUNT(*) AS total FROM (
                    SELECT DISTINCT po.id
                    FROM Post AS po
                    INNER JOIN Admin AS ad ON ad.id = po.admin_id
                    LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                    LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
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
                sent_at,
                edited_at,
                read_percent,
                admin_id,
                admin_given_name,
                admin_family_name
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
                    family_name: admin_family_name
                }
            }));

            return res.status(200).json({
                posts: formattedPostList,
                pagination
            }).end();

        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res.status(500).json({ error: 'internal_server_error' }).end();
            }
        }
    }

    createPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                title,
                description,
                priority,
                students,
                groups,
                image
            } = req.body

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
                INSERT INTO Post (title, description, priority, admin_id, image, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :image, :school_id);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    admin_id: req.user.id,
                    image: imageName,
                    school_id: req.user.school_id,
                });
            } else {
                postInsert = await DB.execute(`
                INSERT INTO Post (title, description, priority, admin_id, school_id)
                    VALUE (:title, :description, :priority, :admin_id, :school_id);`, {
                    title: title,
                    description: description,
                    priority: priority,
                    admin_id: req.user.id,
                    school_id: req.user.school_id,
                });
            }


            const postId = postInsert.insertId;


            if (students && Array.isArray(students) && isValidStringArrayId(students) && students.length > 0) {
                const studentList = await DB.query(
                    `SELECT st.id
                     FROM Student AS st
                     WHERE st.id IN (:students)`,
                    { students }
                );
                console.log(studentList)

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
                                              VALUES ${studentValues}`);
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
                       AND sg.school_id = :school_id`, {
                    groups: groups,
                    school_id: req.user.school_id
                }
                );

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
                                              VALUES ${studentValues}`);
                        }
                    }
                }
            }

            return res.status(200).json({
                post: {
                    id: postId,
                    title: title,
                    description: description,
                    priority: priority,
                }
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

export default PostController

function addToExistingGroupNamesForPost(arg0: string, groupNamesArray: string[]) {
    throw new Error('function_not_implemented');
}