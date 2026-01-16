/**
 * Post Controller
 *
 * HTTP layer for Post operations
 * Thin controller - delegates to service layer
 */

import { Router, Response, Request } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { postService } from './post.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidString,
    isValidArrayId,
    isValidPriority,
    isValidId,
    isValidStringArrayId,
} from '../../utils/validate';

export class PostModuleController implements IController {
    public router: Router = Router();
    private postService = postService;

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // ==================== CRUD Operations (non-dynamic routes first) ====================
        this.router.post('/create', verifyToken, this.createPost);
        this.router.get('/list', verifyToken, this.getPostList);
        this.router.post(
            '/delete-multiple',
            verifyToken,
            this.deleteMultiplePosts
        );

        // ==================== View Operations (specific routes before dynamic :id) ====================
        this.router.get('/:id/students', verifyToken, this.viewPostStudents);
        this.router.get(
            '/:id/student/:student_id',
            verifyToken,
            this.viewPostStudentParents
        );
        this.router.get('/:id/groups', verifyToken, this.viewPostGroups);
        this.router.get(
            '/:id/group/:group_id',
            verifyToken,
            this.viewPostGroupStudents
        );
        this.router.get(
            '/:id/group/:group_id/student/:student_id',
            verifyToken,
            this.viewGroupStudentParent
        );

        // ==================== Retry Push Operations (specific routes before dynamic :id) ====================
        this.router.post(
            '/:id/groups/:group_id',
            verifyToken,
            this.retryGroupPush
        );
        this.router.post(
            '/:id/students/:student_id',
            verifyToken,
            this.retryStudentPush
        );
        this.router.post(
            '/:id/parents/:parent_id',
            verifyToken,
            this.retryParentPush
        );

        // ==================== Update Senders (specific route before dynamic :id) ====================
        this.router.put('/:id/sender', verifyToken, this.updatePostSenders);

        // ==================== CRUD Operations (dynamic :id routes MUST be last) ====================
        this.router.get('/:id', verifyToken, this.getPostDetail);
        this.router.put('/:id', verifyToken, this.updatePost);
        this.router.delete('/:id', verifyToken, this.deletePost);
    }

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create post
     */
    createPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const { title, description, priority, students, groups, image } =
                req.body;

            if (!title || !isValidString(title)) {
                throw new ApiError(401, 'invalid_or_missing_title');
            }
            if (!description || !isValidString(description)) {
                throw new ApiError(401, 'invalid_or_missing_description');
            }
            if (!priority || !isValidPriority(priority)) {
                throw new ApiError(401, 'invalid_or_missing_priority');
            }

            const result = await postService.createPost(
                { title, description, priority, students, groups, image },
                req.user.id,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            console.log('Error occurred while creating post:', e);
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /list - Get post list with pagination
     */
    getPostList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const title = (req.query.title as string) || '';
            const description = (req.query.description as string) || '';
            const priority = (req.query.priority as string) || '';
            const sent_at_from = (req.query.sent_at_from as string) || '';
            const sent_at_to = (req.query.sent_at_to as string) || '';

            const result = await postService.getPostList(
                {
                    page,
                    title,
                    description,
                    priority,
                    sent_at_from,
                    sent_at_to,
                },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id - Get post detail
     */
    getPostDetail = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(401, 'invalid_or_missing_post_id');
            }

            const result = await postService.getPostDetail(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * PUT /:id - Update post
     */
    updatePost = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(401, 'invalid_or_missing_post_id');
            }

            const { title, description, priority, image } = req.body;

            if (!title || !isValidString(title)) {
                throw new ApiError(401, 'invalid_or_missing_title');
            }
            if (!description || !isValidString(description)) {
                throw new ApiError(401, 'invalid_or_missing_description');
            }
            if (!priority || !isValidPriority(priority)) {
                throw new ApiError(401, 'invalid_or_missing_priority');
            }

            const result = await postService.updatePost(
                parseInt(postId),
                { title, description, priority, image },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * DELETE /:id - Delete post
     */
    deletePost = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(401, 'invalid_or_missing_post_id');
            }

            const result = await postService.deletePost(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * POST /delete-multiple - Delete multiple posts
     */
    deleteMultiplePosts = async (req: ExtendedRequest, res: Response) => {
        try {
            const { postIds } = req.body;

            if (
                !postIds ||
                !Array.isArray(postIds) ||
                !isValidArrayId(postIds)
            ) {
                throw new ApiError(400, 'invalid_or_missing_post_ids');
            }

            const result = await postService.deleteMultiplePosts(
                { postIds },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    // ==================== View Operations ====================

    /**
     * GET /:id/students - View post students
     */
    viewPostStudents = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const postId = parseInt(id);
            const page = parseInt(req.query.page as string) || 1;
            const email = req.query.email as string | undefined;
            const student_number = req.query.student_number as
                | string
                | undefined;

            if (isNaN(postId)) {
                return res.status(400).json({ error: 'Invalid post ID' }).end();
            }

            const result = await this.postService.getPostStudents(
                postId,
                page,
                {
                    email,
                    student_number,
                }
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id/student/:student_id - View post student parents
     */
    viewPostStudentParents = async (req: Request, res: Response) => {
        try {
            const { id, student_id } = req.params;
            const postId = parseInt(id);
            const studentId = parseInt(student_id);

            if (isNaN(postId) || isNaN(studentId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post or student ID' })
                    .end();
            }

            const result = await this.postService.getPostStudentParents(
                postId,
                studentId
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id/groups - View post groups
     */
    viewPostGroups = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const postId = parseInt(id);
            const page = parseInt(req.query.page as string) || 1;
            const name = req.query.name as string | undefined;

            if (isNaN(postId)) {
                return res.status(400).json({ error: 'Invalid post ID' }).end();
            }

            const result = await this.postService.getPostGroups(postId, page, {
                name,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id/group/:group_id - View post group students
     */
    viewPostGroupStudents = async (req: Request, res: Response) => {
        try {
            const { id, group_id } = req.params;
            const postId = parseInt(id);
            const groupId = parseInt(group_id);
            const page = parseInt(req.query.page as string) || 1;
            const email = req.query.email as string | undefined;
            const student_number = req.query.student_number as
                | string
                | undefined;

            if (isNaN(postId) || isNaN(groupId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post or group ID' })
                    .end();
            }

            const result = await this.postService.getGroupStudents(
                postId,
                groupId,
                page,
                {
                    email,
                    student_number,
                }
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * GET /:id/group/:group_id/student/:student_id - View group student parent
     */
    viewGroupStudentParent = async (req: Request, res: Response) => {
        try {
            const { id, group_id, student_id } = req.params;
            const postId = parseInt(id);
            const groupId = parseInt(group_id);
            const studentId = parseInt(student_id);

            if (isNaN(postId) || isNaN(groupId) || isNaN(studentId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post, group, or student ID' })
                    .end();
            }

            const result = await this.postService.getGroupStudentParent(
                postId,
                groupId,
                studentId
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    // ==================== Retry Push Operations ====================

    /**
     * POST /:id/groups/:group_id - Group retry push
     */
    retryGroupPush = async (req: Request, res: Response) => {
        try {
            const { id, group_id } = req.params;
            const postId = parseInt(id);
            const groupId = parseInt(group_id);

            if (isNaN(postId) || isNaN(groupId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post or group ID' })
                    .end();
            }

            const result = await this.postService.retryGroupPush(
                postId,
                groupId
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * POST /:id/students/:student_id - Student retry push
     */
    retryStudentPush = async (req: Request, res: Response) => {
        try {
            const { id, student_id } = req.params;
            const postId = parseInt(id);
            const studentId = parseInt(student_id);

            if (isNaN(postId) || isNaN(studentId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post or student ID' })
                    .end();
            }

            const result = await this.postService.retryStudentPush(
                postId,
                studentId
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    /**
     * POST /:id/parents/:parent_id - Parent retry push
     */
    retryParentPush = async (req: Request, res: Response) => {
        try {
            const { id, parent_id } = req.params;
            const postId = parseInt(id);
            const parentId = parseInt(parent_id);

            if (isNaN(postId) || isNaN(parentId)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid post or parent ID' })
                    .end();
            }

            const result = await this.postService.retryParentPush(
                postId,
                parentId
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    // ==================== Update Senders ====================

    /**
     * PUT /:id/sender - Update post senders
     */
    updatePostSenders = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const postId = parseInt(id);
            const schoolId = parseInt(req.headers['x-school-id'] as string);

            if (isNaN(postId)) {
                return res.status(400).json({ error: 'Invalid post ID' }).end();
            }

            const { students, groups } = req.body;

            if (!Array.isArray(students) || !Array.isArray(groups)) {
                return res
                    .status(400)
                    .json({ error: 'Students and groups must be arrays' })
                    .end();
            }

            const studentIds = students
                .map(id => parseInt(id))
                .filter(id => !isNaN(id));
            const groupIds = groups
                .map(id => parseInt(id))
                .filter(id => !isNaN(id));

            const result = await this.postService.updatePostSenders(
                postId,
                schoolId,
                studentIds,
                groupIds
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                return res
                    .status(e.statusCode)
                    .json({ error: e.message })
                    .end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };
}

export default PostModuleController;
