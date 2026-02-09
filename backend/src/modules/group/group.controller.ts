/**
 * Group Controller
 *
 * HTTP layer for Group operations
 * Thin controller - delegates to service layer
 */

import { NextFunction, Router, Response } from 'express';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import { IController } from '../../utils/icontroller';
import { groupService } from './group.service';
import { ApiError } from '../../errors/ApiError';
import {
    isValidId,
    isValidArrayId,
    isValidString,
    isValidStudentNumber,
} from '../../utils/validate';
import DB from '../../utils/db-client';
import { stringify } from 'csv-stringify/sync';
import {
    createBaseResponse,
    parseCSVBuffer,
    finalizeResponse,
    bumpSummary,
    handleCSVUpload,
    RowError,
    CSVRowBase,
} from '../../utils/csv-upload';
import { ErrorKeys, createErrorResponse } from '../../utils/error-codes';

function topologicalSortGroups<
    T extends { name: string; parent_group_name: string | null },
>(groups: T[]): T[] {
    const sorted: T[] = [];
    const visited = new Set<string>();
    const nameToGroup = new Map(groups.map(g => [g.name.toLowerCase(), g]));

    function visit(group: T) {
        const key = group.name.toLowerCase();
        if (visited.has(key)) return;

        if (group.parent_group_name) {
            const parent = nameToGroup.get(
                group.parent_group_name.toLowerCase()
            );
            if (parent && !visited.has(parent.name.toLowerCase())) {
                visit(parent);
            }
        }

        visited.add(key);
        sorted.push(group);
    }

    groups.forEach(visit);
    return sorted;
}

export class GroupModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // CSV operations (must be before /:id routes)
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadGroupsFromCSV
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportGroupsToCSV);

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

    exportGroupsToCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const groups = (await DB.query(
                `SELECT
                    g.id,
                    g.name,
                    g.sub_group_id,
                    pg.name as parent_group_name
                FROM StudentGroup g
                LEFT JOIN StudentGroup pg ON g.sub_group_id = pg.id
                WHERE g.school_id = :school_id
                ORDER BY
                    CASE WHEN g.sub_group_id IS NULL THEN 0 ELSE 1 END,
                    g.sub_group_id,
                    g.name`,
                { school_id: req.user.school_id }
            )) as Array<{
                id: number;
                name: string;
                sub_group_id: number | null;
                parent_group_name: string | null;
                student_numbers?: string[];
            }>;

            if (groups.length === 0) {
                return res.status(404).json({ error: 'No groups found' }).end();
            }

            for (const group of groups) {
                const memberList = (await DB.query(
                    `SELECT st.student_number
                    FROM GroupMember AS gm
                    INNER JOIN Student as st ON gm.student_id = st.id
                    WHERE gm.group_id = :group_id`,
                    { group_id: group.id }
                )) as Array<{ student_number: string }>;
                group.student_numbers = memberList.map(m => m.student_number);
            }

            const csvData = groups.map(group => ({
                name: group.name || '',
                parent_group_name: group.parent_group_name || '',
                student_numbers: (group.student_numbers || []).join(','),
            }));

            const csvContent = stringify(csvData, {
                header: true,
                columns: ['name', 'parent_group_name', 'student_numbers'],
            });

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="groups.csv"'
            );
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
        } catch (e: any) {
            return next(e);
        }
    };

    uploadGroupsFromCSV = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        const { throwInError, action, withCSV } = req.body;
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
            const rows = await parseCSVBuffer(req.file.buffer);
            if (rows.length === 0) {
                response.message = ErrorKeys.csv_is_empty_but_valid;
                return res.status(200).json(response).end();
            }

            interface GroupRow extends CSVRowBase {
                name: string;
                parent_group_name: string | null;
                student_numbers: string[];
            }
            const validGroups: GroupRow[] = [];
            const errors: RowError<GroupRow>[] = [];

            for (const raw of rows) {
                const name = String(raw.name || '').trim();
                const parentName =
                    String(raw.parent_group_name || '').trim() || null;
                const snRaw = String(raw.student_numbers || '').trim();

                const numbers = snRaw
                    ? snRaw
                          .replace(/^['"]|['"]$/g, '')
                          .split(/[,;]/)
                          .map(s => s.trim())
                          .filter(Boolean)
                    : [];

                const rowErrors: Record<string, string> = {};

                if (!name && numbers.length > 0) {
                    const lastGroup = validGroups[validGroups.length - 1];
                    if (lastGroup) {
                        lastGroup.student_numbers.push(...numbers);
                        continue;
                    }
                }

                if (!isValidString(name)) {
                    if (numbers.length === 0) continue;
                    rowErrors.name = ErrorKeys.invalid_name;
                }

                if (numbers.length) {
                    for (const sn of numbers) {
                        if (!isValidStudentNumber(sn)) {
                            rowErrors.student_numbers =
                                ErrorKeys.invalid_student_numbers;
                            break;
                        }
                    }
                }

                if (Object.keys(rowErrors).length > 0) {
                    const existingValid = validGroups.find(
                        g => g.name === name
                    );
                    if (existingValid && !rowErrors.student_numbers) {
                        existingValid.student_numbers.push(...numbers);
                    } else {
                        errors.push({
                            row: {
                                name,
                                parent_group_name: parentName,
                                student_numbers: numbers,
                            },
                            errors: rowErrors,
                        });
                    }
                } else {
                    const existing = validGroups.find(g => g.name === name);
                    if (existing) {
                        existing.student_numbers.push(...numbers);
                        if (parentName) existing.parent_group_name = parentName;
                    } else {
                        validGroups.push({
                            name,
                            parent_group_name: parentName,
                            student_numbers: numbers,
                        });
                    }
                }
            }

            for (const g of validGroups) {
                g.student_numbers = Array.from(new Set(g.student_numbers));
            }

            if (errors.length > 0) {
                if (throwInErrorBool) {
                    response.errors = errors;
                    response.summary.errors = errors.length;
                    return res.status(400).json(response).end();
                }
                response.errors.push(...errors);
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

            const sortedGroups = topologicalSortGroups(validGroups);

            const existingGroups = await DB.query(
                'SELECT id, name FROM StudentGroup WHERE school_id = :school_id',
                { school_id: req.user.school_id }
            );
            const groupNameToId = new Map<string, number>();
            existingGroups.forEach((g: any) =>
                groupNameToId.set(g.name.toLowerCase(), g.id)
            );
            const existingSet = new Set(
                existingGroups.map((g: any) => g.name.toLowerCase())
            );

            for (const group of sortedGroups) {
                const nameKey = group.name.toLowerCase();

                let subGroupId: number | null = null;
                if (group.parent_group_name) {
                    const parentId = groupNameToId.get(
                        group.parent_group_name.toLowerCase()
                    );
                    if (parentId) {
                        subGroupId = parentId;
                    } else {
                        response.errors.push({
                            row: group,
                            errors: {
                                parent_group_name:
                                    ErrorKeys.parent_group_not_found,
                            },
                        });
                        if (throwInErrorBool) continue;
                    }
                }

                if (action === 'create') {
                    if (existingSet.has(nameKey)) {
                        response.errors.push({
                            row: group,
                            errors: {
                                name: ErrorKeys.group_name_already_exists,
                            },
                        });
                        continue;
                    }
                    try {
                        const insert = await DB.execute(
                            `INSERT INTO StudentGroup(name, created_at, school_id, sub_group_id)
                             VALUE (:name, NOW(), :school_id, :sub_group_id);`,
                            {
                                name: group.name,
                                school_id: req.user.school_id,
                                sub_group_id: subGroupId,
                            }
                        );
                        const groupId = insert.insertId;

                        groupNameToId.set(nameKey, groupId);
                        existingSet.add(nameKey);

                        const attachedMembers: any[] = [];
                        if (group.student_numbers.length) {
                            const studentRows = await DB.query(
                                `SELECT id, student_number FROM Student WHERE student_number IN (:sns) AND school_id = :school_id`,
                                {
                                    sns: group.student_numbers,
                                    school_id: req.user.school_id,
                                }
                            );
                            if (studentRows.length) {
                                for (const st of studentRows) {
                                    await DB.execute(
                                        `INSERT INTO GroupMember (group_id, student_id) VALUES (:group_id, :student_id)`,
                                        { group_id: groupId, student_id: st.id }
                                    );
                                }
                                attachedMembers.push(...studentRows);
                            } else if (group.student_numbers.length > 0) {
                                response.errors.push({
                                    row: group,
                                    errors: {
                                        student_numbers:
                                            ErrorKeys.invalid_student_numbers,
                                    },
                                });
                            }
                        }
                        response.inserted.push({
                            ...group,
                            sub_group_id: subGroupId,
                            members: attachedMembers,
                        });
                    } catch (err: any) {
                        if (err?.code === 'ER_DUP_ENTRY') {
                            response.errors.push({
                                row: group,
                                errors: {
                                    name: ErrorKeys.group_name_already_exists,
                                },
                            });
                            continue;
                        }
                        throw err;
                    }
                } else if (action === 'update') {
                    if (!existingSet.has(nameKey)) {
                        response.errors.push({
                            row: group,
                            errors: { name: ErrorKeys.group_does_not_exist },
                        });
                        continue;
                    }

                    const gId = groupNameToId.get(nameKey)!;

                    await DB.execute(
                        `UPDATE StudentGroup SET name = :name, sub_group_id = :sub_group_id
                         WHERE id = :id AND school_id = :school_id`,
                        {
                            id: gId,
                            name: group.name,
                            sub_group_id: subGroupId,
                            school_id: req.user.school_id,
                        }
                    );

                    if (group.student_numbers.length) {
                        const existingStudents = await DB.query(
                            `SELECT st.id, st.student_number
                             FROM GroupMember gm
                             INNER JOIN Student st ON gm.student_id = st.id
                             WHERE gm.group_id = :gid`,
                            { gid: gId }
                        );
                        const futureStudents = await DB.query(
                            `SELECT id, student_number FROM Student WHERE student_number IN (:sns) AND school_id = :school_id`,
                            {
                                sns: group.student_numbers,
                                school_id: req.user.school_id,
                            }
                        );
                        const deleted = existingStudents.filter(
                            (ex: any) =>
                                !futureStudents.some(
                                    (f: any) =>
                                        f.student_number === ex.student_number
                                )
                        );
                        const added = futureStudents.filter(
                            (f: any) =>
                                !existingStudents.some(
                                    (ex: any) =>
                                        ex.student_number === f.student_number
                                )
                        );
                        for (const d of deleted) {
                            await DB.execute(
                                `DELETE FROM GroupMember WHERE group_id = :gid AND student_id = :sid`,
                                { gid: gId, sid: d.id }
                            );
                        }
                        for (const a of added) {
                            await DB.execute(
                                `INSERT INTO GroupMember (group_id, student_id) VALUES (:gid, :sid)`,
                                { gid: gId, sid: a.id }
                            );
                        }
                        response.updated.push({
                            ...group,
                            sub_group_id: subGroupId,
                            members: futureStudents,
                        });
                    } else {
                        response.updated.push({
                            ...group,
                            sub_group_id: subGroupId,
                            members: [],
                        });
                    }
                } else if (action === 'delete') {
                    if (!existingSet.has(nameKey)) {
                        response.errors.push({
                            row: group,
                            errors: { name: ErrorKeys.group_does_not_exist },
                        });
                        continue;
                    }
                    await DB.execute(
                        `DELETE FROM StudentGroup WHERE name = :name AND school_id = :school_id`,
                        { name: group.name, school_id: req.user.school_id }
                    );
                    response.deleted.push(group);
                }
            }

            bumpSummary(response, 'inserted');
            bumpSummary(response, 'updated');
            bumpSummary(response, 'deleted');
            response.summary.errors = response.errors.length;
            finalizeResponse(response, withCSVBool);
            return res
                .status(response.errors.length ? 400 : 200)
                .json(response)
                .end();
        } catch (e: any) {
            return next(e);
        }
    };

    downloadCSVTemplate = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const headers = ['name', 'parent_group_name', 'student_numbers'];

            const csvContent = stringify([headers], {
                header: false,
                delimiter: ',',
            });

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="group_template.csv"'
            );

            const bom = '\uFEFF';
            res.send(bom + csvContent);
        } catch (e: any) {
            return next(e);
        }
    };

    // ==================== List/View Endpoints ====================

    /**
     * POST /ids - Get groups by ID array
     */
    getGroupsByIds = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * GET /list - Get group list with pagination
     */
    getGroupList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * GET /:id - Get group detail with members
     */
    getGroupDetail = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    // ==================== CRUD Endpoints ====================

    /**
     * POST /create - Create group
     */
    createGroup = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * PUT /:id - Update group
     */
    updateGroup = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    /**
     * DELETE /:id - Delete group
     */
    deleteGroup = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };

    // ==================== Hierarchy Endpoint ====================

    /**
     * GET /:id/sub-groups - Get sub-groups
     */
    getSubGroups = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            return next(e);
        }
    };
}

export default GroupModuleController;
