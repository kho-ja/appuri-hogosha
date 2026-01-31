// Parent Module Controller (Vertical Slice)
// Thin controller: request parse + validate + service call + response

import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router, NextFunction } from 'express';
import {
    isValidArrayId,
    isValidId,
    isValidPhoneNumber,
    isValidEmail,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import { ApiError } from '../../errors/ApiError';
import { createParentService } from './parent.service';
import { syncronizePosts } from '../../utils/messageHelper';
import DB from '../../utils/db-client';
import { stringify } from 'csv-stringify/sync';
import { parseKintoneRow } from '../../utils/helper';
import { Connection } from 'mysql2/promise';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';
import {
    handleCSVUpload,
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    RowError as GenericRowError,
    CSVRowBase,
} from '../../utils/csv-upload';

interface CognitoClient {
    register(
        username: string,
        email: string | null,
        phoneNumber: string
    ): Promise<{ sub_id: string }>;
    delete(phoneNumber: string): Promise<void>;
    resendTemporaryPassword(phoneNumber: string): Promise<{ message: string }>;
}

interface ParentCSVRow extends CSVRowBase {
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_numbers: string[];
}

type ParentRowError = GenericRowError<ParentCSVRow>;

class ParentModuleController implements IController {
    public router: Router = express.Router();
    private parentService: ReturnType<typeof createParentService>;
    public cognitoClient: CognitoClient;

    constructor(cognitoClient: CognitoClient) {
        this.cognitoClient = cognitoClient;
        this.parentService = createParentService(cognitoClient);
        this.initRoutes();
    }

    initRoutes(): void {
        // CSV/Kintone endpoints (must be before /:id routes)
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadParentsFromCSV
        );
        this.router.post(
            '/kintoneUpload',
            verifyToken,
            this.uploadParentsFromKintone
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportParentsToCSV);

        this.router.post('/ids', verifyToken, this.getParentsByIds);
        this.router.post('/list', verifyToken, this.getParentList);
        this.router.post(
            '/list/detailed',
            verifyToken,
            this.getDetailedParentList
        );
        this.router.get('/:id', verifyToken, this.getParentDetail);
        this.router.post(
            '/get-details',
            verifyToken,
            this.getParentDetailSecure
        );
        this.router.post('/create', verifyToken, this.createParent);
        this.router.put('/:id', verifyToken, this.updateParent);
        this.router.delete('/:id', verifyToken, this.deleteParent);
        this.router.post(
            '/:id/resend-password',
            verifyToken,
            this.resendPassword
        );
        this.router.post(
            '/bulk-resend-password',
            verifyToken,
            this.bulkResendPassword
        );
        this.router.get('/:id/students', verifyToken, this.getParentStudents);
        this.router.post(
            '/get-students',
            verifyToken,
            this.getParentStudentsSecure
        );
        this.router.post(
            '/:id/students',
            verifyToken,
            this.changeParentStudents
        );
    }

    /**
     * Get parents by their IDs
     * POST /ids
     * Body: { parentIds: number[] }
     */
    getParentsByIds = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentIds } = req.body;

            // Validate request
            if (!parentIds || !Array.isArray(parentIds)) {
                throw ApiError.badRequest('Parent IDs must be an array');
            }

            if (!isValidArrayId(parentIds)) {
                throw ApiError.badRequest('Invalid parent ID list');
            }

            // Call service layer
            const result = await this.parentService.getParentsByIds({
                parentIds,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get paginated parent list with filters
     * POST /list
     * Body: { page?, email?, phone_number?, name?, showOnlyNonLoggedIn? }
     */
    getParentList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';
            const showOnlyNonLoggedIn = req.body.showOnlyNonLoggedIn || false;

            // Call service layer
            const result = await this.parentService.getParentList({
                schoolId: req.user.school_id,
                page,
                email: email || undefined,
                phone_number: phone_number || undefined,
                name: name || undefined,
                showOnlyNonLoggedIn,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent detail
     * GET /:id
     */
    getParentDetail = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid or missing parent ID');
            }

            // Call service layer
            const result = await this.parentService.getParentDetail({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent detail (secure POST version)
     * POST /get-details
     * Body: { parentId }
     */
    getParentDetailSecure = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentId } = req.body;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid or missing parent ID');
            }

            // Call service layer
            const result = await this.parentService.getParentDetail({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get detailed parent list with arn field
     * POST /list/detailed
     * Body: { page?, email?, phone_number?, name? }
     */
    getDetailedParentList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const page = parseInt(req.body.page as string) || 1;
            const email = (req.body.email as string) || '';
            const phone_number = (req.body.phone_number as string) || '';
            const name = (req.body.name as string) || '';

            // Call service layer
            const result = await this.parentService.getDetailedParentList({
                schoolId: req.user.school_id,
                page,
                email: email || undefined,
                phone_number: phone_number || undefined,
                name: name || undefined,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Create a new parent
     * POST /create
     * Body: { email?, phone_number, given_name?, family_name?, students? }
     */
    createParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { email, phone_number, students } = req.body;
            let { given_name, family_name } = req.body as any;

            // Validate phone
            if (!phone_number || !isValidPhoneNumber(phone_number)) {
                throw ApiError.badRequest('invalid_or_missing_phone');
            }

            // Validate names (optional but must be valid if provided)
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw ApiError.badRequest('invalid_or_missing_given_name');
            }
            if (family_name && !isValidString(family_name)) {
                throw ApiError.badRequest('invalid_or_missing_family_name');
            }

            // Validate students array
            if (
                students &&
                (!Array.isArray(students) ||
                    !isValidArrayId(students) ||
                    students.length > 5)
            ) {
                throw ApiError.badRequest('invalid_students_array');
            }

            // Call service
            const result = await this.parentService.createParent({
                email: email || null,
                phone_number,
                given_name: given_name || '',
                family_name: family_name || '',
                students: students || [],
                schoolId: req.user.school_id,
            });

            // Sync posts (external side effect)
            if (result.parent.students.length > 0) {
                for (const student of result.parent.students) {
                    await syncronizePosts(result.parent.id, student.id);
                }
            }

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Update parent
     * PUT /:id
     * Body: { email?, phone_number, given_name?, family_name? }
     */
    updateParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;
            const { phone_number, email } = req.body;
            let { given_name, family_name } = req.body as any;

            // Validate parent ID
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Validate email
            if (email !== null && email && !isValidEmail(email)) {
                throw ApiError.badRequest('invalid_or_missing_email');
            }

            // Validate names
            if (typeof given_name === 'string') given_name = given_name.trim();
            if (typeof family_name === 'string')
                family_name = family_name.trim();
            if (given_name && !isValidString(given_name)) {
                throw ApiError.badRequest('invalid_or_missing_given_name');
            }
            if (family_name && !isValidString(family_name)) {
                throw ApiError.badRequest('invalid_or_missing_family_name');
            }

            // Call service
            const result = await this.parentService.updateParent({
                parentId,
                email: email || null,
                phone_number,
                given_name: given_name || '',
                family_name: family_name || '',
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Delete parent
     * DELETE /:id
     */
    deleteParent = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.deleteParent({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Resend temporary password
     * POST /:id/resend-password
     */
    resendPassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('Invalid parent ID');
            }

            // Call service
            const result = await this.parentService.resendPassword({
                parentId,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Bulk resend temporary passwords
     * POST /bulk-resend-password
     * Body: { parentIds: number[] }
     */
    bulkResendPassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentIds } = req.body;

            // Validate
            if (!Array.isArray(parentIds) || parentIds.length === 0) {
                throw ApiError.badRequest('Invalid parent IDs array');
            }

            for (const id of parentIds) {
                if (!isValidId(id)) {
                    throw ApiError.badRequest(`Invalid parent ID: ${id}`);
                }
            }

            // Call service
            const result = await this.parentService.bulkResendPassword({
                parentIds,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get parent with students
     * GET /:id/students
     */
    getParentStudents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.getParentStudents({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Get students for parent (secure POST version)
     * POST /get-students
     * Body: { parentId }
     */
    getParentStudentsSecure = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { parentId } = req.body;

            // Validate
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Call service
            const result = await this.parentService.getParentStudentsSecure({
                parentId,
                schoolId: req.user.school_id,
            });

            return res.status(200).json(result).end();
        } catch (e: any) {
            next(e);
        }
    };

    /**
     * Change parent's students
     * POST /:id/students
     * Body: { students: number[] }
     */
    changeParentStudents = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parentId = req.params.id;
            const { students } = req.body;

            // Validate parent ID
            if (!parentId || !isValidId(parentId)) {
                throw ApiError.badRequest('invalid_or_missing_parent_id');
            }

            // Validate students array
            if (
                !students ||
                !Array.isArray(students) ||
                !isValidArrayId(students)
            ) {
                throw ApiError.badRequest('invalid_or_missing_students');
            }

            // Call service
            const result = await this.parentService.changeParentStudents({
                parentId,
                students,
                schoolId: req.user.school_id,
            });

            // Sync posts for new students (side effect)
            if (result.newStudentIds && result.newStudentIds.length > 0) {
                for (const studentId of result.newStudentIds) {
                    await syncronizePosts(parseInt(parentId), studentId);
                }
            }

            return res.status(200).json({ message: result.message }).end();
        } catch (e: any) {
            next(e);
        }
    };

    // ==================== CSV / Kintone Methods ====================

    uploadParentsFromKintone = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.parentService.uploadParentsFromKintone({
                schoolId: req.user.school_id,
                ...req.body,
            });

            return res.status(result.status).json(result.body).end();
        } catch (e: any) {
            next(e);
        }
    };

    exportParentsToCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.parentService.exportParentsToCSV(
                req.user.school_id
            );

            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + result.filename
            );
            res.setHeader('Content-Type', result.contentType);
            res.send(Buffer.from(result.csvContent, 'utf-8'));
        } catch (e: any) {
            if (e instanceof ApiError && e.statusCode === 404) {
                return res
                    .status(404)
                    .json({ error: 'No parents found' })
                    .end();
            }
            next(e);
        }
    };

    uploadParentsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, action, withCSV } = req.body;

        if (!req.file || !req.file.buffer) {
            return res
                .status(400)
                .json(createErrorResponse(ErrorKeys.file_missing))
                .end();
        }
        if (!action || !['create', 'update', 'delete'].includes(action)) {
            return res
                .status(400)
                .json(
                    createErrorResponse(
                        ErrorKeys.server_error,
                        'invalid_action'
                    )
                )
                .end();
        }

        const result = await this.parentService.uploadParentsFromCSV({
            fileBuffer: req.file.buffer,
            throwInError,
            action,
            withCSV,
            schoolId: req.user.school_id,
        });

        return res.status(result.status).json(result.body).end();
    };

    downloadCSVTemplate = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const template = this.parentService.getCSVTemplate();

            res.setHeader('Content-Type', template.contentType);
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=' + template.filename
            );

            res.send(template.csvContent);
        } catch (e: any) {
            return next(e);
        }
    };
}

export default ParentModuleController;
