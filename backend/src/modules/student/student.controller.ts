/**
 * Student Controller
 *
 * HTTP layer for Student operations
 * Thin controller - delegates to service layer
 */

import { Router, Response } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { studentService } from './student.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidId,
    isValidArrayId,
    isValidEmail,
    isValidPhoneNumber,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import { syncronizePosts } from '../../utils/messageHelper';

export class StudentModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // List/View endpoints
        this.router.post('/ids', verifyToken, this.getStudentsByIds);
        this.router.post('/list', verifyToken, this.getStudentList);
        this.router.get('/:id', verifyToken, this.getStudentDetail);

        // CRUD endpoints
        this.router.post('/create', verifyToken, this.createStudent);
        this.router.put('/:id', verifyToken, this.updateStudent);
        this.router.delete('/:id', verifyToken, this.deleteStudent);

        // Relationship endpoints
        this.router.get('/:id/parents', verifyToken, this.getStudentParents);
        this.router.post(
            '/:id/parents',
            verifyToken,
            this.changeStudentParents
        );
    }

    // ==================== List/View Endpoints ====================

    /**
     * POST /ids - Get students by ID array
     */
    getStudentsByIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { studentIds } = req.body;

            if (
                !studentIds ||
                !Array.isArray(studentIds) ||
                !isValidArrayId(studentIds)
            ) {
                throw new ApiError(400, 'invalid_id_list');
            }

            const result = await studentService.getStudentsByIds(
                studentIds,
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
     * POST /list - Get student list with filters
     */
    getStudentList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const filterBy = (req.body.filterBy as string) || 'all';
            const filterValue = (req.body.filterValue as string) || '';

            // Whitelist validation
            const allowedFilterColumns = [
                'all',
                'student_number',
                'cohort',
                'email',
                'phone_number',
                'given_name',
                'family_name',
            ];

            if (!allowedFilterColumns.includes(filterBy)) {
                throw new ApiError(400, 'invalid_filter_column');
            }

            const result = await studentService.getStudentList(
                {
                    page,
                    filterBy: filterBy as any,
                    filterValue,
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
     * GET /:id - Get student detail
     */
    getStudentDetail = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.getStudentDetail(
                parseInt(studentId),
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
     * POST /create - Create student
     */
    createStudent = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                email,
                phone_number,
                given_name,
                family_name,
                student_number: studentNumber,
                cohort,
                parents,
            } = req.body;

            // Normalize student_number
            const student_number = String(studentNumber ?? '').replace(
                /\D+/g,
                ''
            );

            // Validate required fields
            if (!email || !isValidEmail(email)) {
                throw new ApiError(400, 'invalid_or_missing_email');
            }
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(400, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(400, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(400, 'invalid_or_missing_family_name');
            }
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw new ApiError(400, 'invalid_or_missing_student_number');
            }

            // Validate parents array
            if (
                parents &&
                (!Array.isArray(parents) || !isValidArrayId(parents))
            ) {
                throw new ApiError(400, 'invalid_parents_array');
            }

            const result = await studentService.createStudent(
                {
                    email,
                    phone_number,
                    given_name,
                    family_name,
                    student_number,
                    cohort,
                    parents,
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
     * PUT /:id - Update student
     */
    updateStudent = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;
            const {
                phone_number,
                given_name,
                family_name,
                student_number: studentNumber,
                cohort,
            } = req.body;

            // Validate student ID
            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            // Normalize student_number
            const student_number = String(studentNumber ?? '').replace(
                /\D+/g,
                ''
            );

            // Validate required fields
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw new ApiError(400, 'invalid_or_missing_phone');
            }
            if (!given_name || !isValidString(given_name)) {
                throw new ApiError(400, 'invalid_or_missing_given_name');
            }
            if (!family_name || !isValidString(family_name)) {
                throw new ApiError(400, 'invalid_or_missing_family_name');
            }
            if (!student_number || !isValidStudentNumber(student_number)) {
                throw new ApiError(400, 'invalid_or_missing_student_number');
            }

            const result = await studentService.updateStudent(
                {
                    id: studentId,
                    phone_number,
                    given_name,
                    family_name,
                    student_number,
                    cohort,
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
     * DELETE /:id - Delete student
     */
    deleteStudent = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.deleteStudent(
                parseInt(studentId),
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

    // ==================== Relationship Endpoints ====================

    /**
     * GET /:id/parents - Get student parents
     */
    getStudentParents = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            const result = await studentService.getStudentParents(
                parseInt(studentId),
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
     * POST /:id/parents - Change student parents
     */
    changeStudentParents = async (req: ExtendedRequest, res: Response) => {
        try {
            const studentId = req.params.id;
            const { parents } = req.body;

            if (!studentId || !isValidId(studentId)) {
                throw new ApiError(400, 'invalid_or_missing_student_id');
            }

            if (
                !parents ||
                !Array.isArray(parents) ||
                !isValidArrayId(parents)
            ) {
                throw new ApiError(400, 'invalid_or_missing_parents');
            }

            const { response, newParentIds } =
                await studentService.changeStudentParents(
                    {
                        id: studentId,
                        parents,
                    },
                    req.user.school_id
                );

            // Side effect: Synchronize posts for new parents
            if (newParentIds.length > 0) {
                for (const parentId of newParentIds) {
                    await syncronizePosts(parentId, parseInt(studentId));
                }
            }

            return res.status(200).json(response).end();
        } catch (e: any) {
            if (e instanceof ApiError) {
                const errorResponse: any = { error: e.message };
                if (e.details) {
                    errorResponse.details = e.details;
                }
                return res.status(e.statusCode).json(errorResponse).end();
            }
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };
}

export default StudentModuleController;
