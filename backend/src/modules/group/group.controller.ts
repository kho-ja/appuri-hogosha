/**
 * Group Controller
 *
 * HTTP layer for Group operations
 * Thin controller - delegates to service layer
 */

import { Router, Response } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { groupService } from './group.service';
import { ApiError } from '../../errors/ApiError';
import { isValidId, isValidArrayId, isValidString } from '../../utils/validate';

export class GroupModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // List/View endpoints
        this.router.post('/ids', verifyToken, this.getGroupsByIds);
        this.router.get('/list', verifyToken, this.getGroupList);
        this.router.get('/:id', verifyToken, this.getGroupDetail);

        // CRUD endpoints
        this.router.post('/create', verifyToken, this.createGroup);
        this.router.put('/:id', verifyToken, this.updateGroup);
        this.router.delete('/:id', verifyToken, this.deleteGroup);

        // Hierarchy endpoint
        this.router.get('/:id/sub-groups', verifyToken, this.getSubGroups);
    }

    // ==================== List/View Endpoints ====================

    /**
     * POST /ids - Get groups by ID array
     */
    getGroupsByIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { groupIds } = req.body;

            if (
                !groupIds ||
                !Array.isArray(groupIds) ||
                !isValidArrayId(groupIds)
            ) {
                throw new ApiError(400, 'invalid_id_list');
            }

            const result = await groupService.getGroupsByIds(
                groupIds,
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
     * GET /list - Get group list with pagination
     */
    getGroupList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const all = req.query.all === 'true';
            const name = (req.query.name as string) || undefined;

            const result = await groupService.getGroupList(
                { page, all, name },
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
     * GET /:id - Get group detail with members
     */
    getGroupDetail = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw new ApiError(400, 'invalid_or_missing_group_id');
            }

            const context = req.query.context as string;
            const page = parseInt(req.query.page as string) || 1;
            const email = (req.query.email as string) || '';
            const student_number = (req.query.student_number as string) || '';

            const result = await groupService.getGroupDetail(
                {
                    id: groupId,
                    context,
                    page,
                    email,
                    student_number,
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

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create group
     */
    createGroup = async (req: ExtendedRequest, res: Response) => {
        try {
            const { name, students, sub_group_id } = req.body;

            if (!name || !isValidString(name)) {
                throw new ApiError(400, 'invalid_or_missing_group_name');
            }

            if (sub_group_id && !isValidId(sub_group_id)) {
                throw new ApiError(400, 'invalid_sub_group_id');
            }

            if (
                students &&
                (!Array.isArray(students) || !isValidArrayId(students))
            ) {
                throw new ApiError(400, 'invalid_students_array');
            }

            const result = await groupService.createGroup(
                {
                    name,
                    sub_group_id,
                    students,
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
     * PUT /:id - Update group
     */
    updateGroup = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;
            const { name, students, sub_group_id } = req.body;

            if (!groupId || !isValidId(groupId)) {
                throw new ApiError(400, 'invalid_or_missing_group_id');
            }

            if (!name || !isValidString(name)) {
                throw new ApiError(400, 'invalid_or_missing_group_name');
            }

            if (
                sub_group_id !== undefined &&
                sub_group_id !== null &&
                !isValidId(sub_group_id)
            ) {
                throw new ApiError(400, 'invalid_sub_group_id');
            }

            if (
                students &&
                (!Array.isArray(students) || !isValidArrayId(students))
            ) {
                throw new ApiError(400, 'invalid_students_array');
            }

            const result = await groupService.updateGroup(
                {
                    id: groupId,
                    name,
                    sub_group_id,
                    students,
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
     * DELETE /:id - Delete group
     */
    deleteGroup = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw new ApiError(400, 'invalid_or_missing_group_id');
            }

            const result = await groupService.deleteGroup(
                parseInt(groupId),
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

    // ==================== Hierarchy Endpoint ====================

    /**
     * GET /:id/sub-groups - Get sub-groups
     */
    getSubGroups = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw new ApiError(400, 'invalid_or_missing_group_id');
            }

            const result = await groupService.getSubGroups(
                parseInt(groupId),
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
}

export default GroupModuleController;
