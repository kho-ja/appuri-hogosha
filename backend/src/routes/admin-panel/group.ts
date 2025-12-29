import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';
import { generatePaginationLinks } from '../../utils/helper';
import DB from '../../utils/db-client';
import {
    isValidString,
    isValidId,
    isValidArrayId,
    isValidStudentNumber,
} from '../../utils/validate';
import process from 'node:process';
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

class GroupController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createGroup);
        this.router.get('/list', verifyToken, this.groupFilter);
        this.router.post('/ids', verifyToken, this.groupByIds);
        this.router.post(
            '/upload',
            verifyToken,
            handleCSVUpload,
            this.uploadGroupsFromCSV
        );
        this.router.get('/template', verifyToken, this.downloadCSVTemplate);
        this.router.get('/export', verifyToken, this.exportGroupsToCSV);

        this.router.get('/:id', verifyToken, this.groupView);
        this.router.delete('/:id', verifyToken, this.groupDelete);
        this.router.put('/:id', verifyToken, this.groupEdit);
        this.router.get('/:id/sub-groups', verifyToken, this.getSubGroups);
    }

    exportGroupsToCSV = async (req: ExtendedRequest, res: Response) => {
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
            console.error('Export error:', e);
            return res
                .status(500)
                .json({ error: 'Internal server error', details: e.message })
                .end();
        }
    };

    uploadGroupsFromCSV = async (req: ExtendedRequest, res: Response) => {
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
                          .replace(/^["']|["']$/g, '')
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
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error, e.message))
                .end();
        }
    };

    groupEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }
            const groupInfo = await DB.query(
                `SELECT
                    id, name, created_at, school_id, sub_group_id
                    FROM StudentGroup
                    WHERE id = :id AND school_id = :school_id`,
                {
                    id: groupId,
                    school_id: req.user.school_id,
                }
            );

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'student_not_found',
                };
            }

            const group = groupInfo[0];

            const { name, students, sub_group_id } = req.body;

            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_name',
                };
            }

            const finalSubGroupId =
                sub_group_id !== undefined ? sub_group_id : group.sub_group_id;

            if (finalSubGroupId !== null && finalSubGroupId !== undefined) {
                if (!isValidId(finalSubGroupId)) {
                    throw {
                        status: 400,
                        message: 'invalid_sub_group_id',
                    };
                }

                const subGroupExists = await DB.query(
                    `SELECT id FROM StudentGroup WHERE id = :id AND school_id = :school_id`,
                    {
                        id: finalSubGroupId,
                        school_id: req.user.school_id,
                    }
                );

                if (subGroupExists.length === 0) {
                    throw {
                        status: 404,
                        message: 'sub_group_not_found',
                    };
                }

                if (parseInt(finalSubGroupId) === parseInt(group.id)) {
                    throw {
                        status: 400,
                        message: 'cannot_reference_self_as_sub_group',
                    };
                }
            }

            await DB.execute(
                'UPDATE StudentGroup SET name = :name, sub_group_id = :sub_group_id WHERE id = :id',
                {
                    id: group.id,
                    name: name,
                    sub_group_id: finalSubGroupId,
                }
            );

            if (
                students &&
                Array.isArray(students) &&
                isValidArrayId(students)
            ) {
                const existMembers = await DB.query(
                    `SELECT student_id
                    FROM GroupMember
                    WHERE group_id = :group_id;`,
                    {
                        group_id: group.id,
                    }
                );

                const existMemberIds = existMembers.map(
                    (student: any) => student.student_id
                );
                const insertStudentIds = students.filter(
                    (id: any) => !existMemberIds.includes(id)
                );
                const deleteStudentIds = existMemberIds.filter(
                    (id: any) => !students.includes(id)
                );

                if (deleteStudentIds.length > 0) {
                    await DB.query(
                        `DELETE FROM GroupMember
                        WHERE group_id = :group_id AND student_id IN (:studentIds);`,
                        {
                            group_id: group.id,
                            studentIds: deleteStudentIds,
                        }
                    );

                    await DB.query(
                        `DELETE FROM PostStudent AS ps
                        WHERE ps.student_id IN (:studentIds) AND ps.group_id = :group_id;`,
                        {
                            group_id: group.id,
                            studentIds: deleteStudentIds,
                        }
                    );
                }

                if (insertStudentIds.length > 0) {
                    if (!isValidArrayId(insertStudentIds)) {
                        throw {
                            status: 400,
                            message: 'invalid_student_id',
                        };
                    }

                    const insertData = insertStudentIds.map(
                        (studentId: any) => [Number(studentId), group.id]
                    );
                    for (const row of insertData) {
                        const [student_id, group_id] = row;
                        await DB.execute(
                            `INSERT INTO GroupMember (student_id, group_id) VALUES (:student_id, :group_id)`,
                            { student_id, group_id }
                        );
                    }
                }
            }

            return res
                .status(200)
                .json({
                    message: 'Group changed successfully',
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

    groupDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }
            const groupInfo = await DB.query(
                `SELECT
                    id, name, created_at, school_id
                    FROM StudentGroup
                    WHERE id = :id AND school_id = :school_id`,
                {
                    id: groupId,
                    school_id: req.user.school_id,
                }
            );

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'student_not_found',
                };
            }

            await DB.execute('DELETE FROM StudentGroup WHERE id = :id;', {
                id: groupId,
            });

            return res
                .status(200)
                .json({
                    message: 'groupDeleted',
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

    groupByIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { groupIds } = req.body;

            if (
                groupIds &&
                Array.isArray(groupIds) &&
                isValidArrayId(groupIds)
            ) {
                const groupList = await DB.query(
                    `SELECT id,name FROM StudentGroup
                    WHERE id IN (:groups) AND school_id = :school_id;`,
                    {
                        groups: groupIds,
                        school_id: req.user.school_id,
                    }
                );

                return res
                    .status(200)
                    .json({
                        groupList,
                    })
                    .end();
            } else {
                throw {
                    status: 401,
                    message: 'invalid_id_list',
                };
            }
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

    groupView = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;
            const context = req.query.context as string;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_id',
                };
            }
            const groupInfo = await DB.query(
                `SELECT 
                    sg.id, 
                    sg.name, 
                    sg.created_at, 
                    sg.sub_group_id,
                    parent_sg.name as sub_group_name
                FROM StudentGroup sg
                LEFT JOIN StudentGroup parent_sg ON sg.sub_group_id = parent_sg.id
                WHERE sg.id = :id AND sg.school_id = :school_id`,
                {
                    id: groupId,
                    school_id: req.user.school_id,
                }
            );

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'group_not_found',
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
                group_id: group.id,
                limit: limit,
                offset: offset,
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
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            let groupMembers;

            if (context === 'view') {
                groupMembers = await DB.query(
                    `SELECT
                    st.id,st.phone_number,st.email,
                    st.student_number, st.given_name, st.family_name, st.cohort
                FROM GroupMember AS gm
                INNER JOIN Student AS st on gm.student_id = st.id
                WHERE gm.group_id = :group_id ${whereClause}
                ORDER BY gm.id DESC
                LIMIT :limit OFFSET :offset;`,
                    params
                );
            } else {
                groupMembers = await DB.query(
                    `SELECT
                    st.id,st.phone_number,st.email,
                    st.student_number, st.given_name, st.family_name, st.cohort
                FROM GroupMember AS gm
                INNER JOIN Student AS st on gm.student_id = st.id
                WHERE gm.group_id = :group_id ${whereClause}
                ORDER BY gm.id DESC;`,
                    { group_id: groupId }
                );
            }

            const totalMembers = (
                await DB.query(
                    `SELECT COUNT(*) as total
                FROM GroupMember as gm
                INNER JOIN Student AS st on gm.student_id = st.id
                WHERE gm.group_id = :group_id ${whereClause};`,
                    params
                )
            )[0].total;

            const totalPages = Math.ceil(totalMembers / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_members: totalMembers,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            };

            return res
                .status(200)
                .json({
                    group: group,
                    members: groupMembers,
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

    groupFilter = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;
            const all = req.query.all === 'true';

            const name = (req.query.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
            };

            if (!all) {
                params.limit = limit;
                params.offset = offset;
            }

            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const limitClause = all ? '' : 'LIMIT :limit OFFSET :offset';

            const groupList = await DB.query(
                `SELECT 
                    sg.id, 
                    sg.name,
                    sg.sub_group_id,
                    parent_sg.name as sub_group_name,
                    (SELECT COUNT(*) AS total FROM GroupMember WHERE group_id = sg.id) as member_count
                FROM StudentGroup as sg
                LEFT JOIN StudentGroup parent_sg ON sg.sub_group_id = parent_sg.id
                WHERE sg.school_id = :school_id ${whereClause}
                ORDER BY sg.id DESC
                ${limitClause};`,
                params
            );

            if (all) {
                return res.status(200).json({ groups: groupList }).end();
            }

            const totalGroups = (
                await DB.query(
                    `SELECT COUNT(*) as total
                FROM StudentGroup AS sg WHERE sg.school_id = :school_id ${whereClause};`,
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
                    groups: groupList,
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

    createGroup = async (req: ExtendedRequest, res: Response) => {
        try {
            const { name, students, sub_group_id } = req.body;

            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_name',
                };
            }

            if (sub_group_id) {
                if (!isValidId(sub_group_id)) {
                    throw {
                        status: 400,
                        message: 'invalid_sub_group_id',
                    };
                }

                const subGroupExists = await DB.query(
                    `SELECT id FROM StudentGroup WHERE id = :id AND school_id = :school_id`,
                    {
                        id: sub_group_id,
                        school_id: req.user.school_id,
                    }
                );

                if (subGroupExists.length === 0) {
                    throw {
                        status: 404,
                        message: 'sub_group_not_found',
                    };
                }
            }

            const existingGroup = await DB.query(
                `SELECT id FROM StudentGroup WHERE name = :name AND school_id = :school_id`,
                {
                    name: name,
                    school_id: req.user.school_id,
                }
            );

            if (existingGroup.length > 0) {
                throw {
                    status: 400,
                    message: 'group_name_already_exists',
                };
            }

            const groupInsert = await DB.execute(
                `INSERT INTO StudentGroup(name, created_at, school_id, sub_group_id)
                VALUE (:name, NOW(), :school_id, :sub_group_id);`,
                {
                    name: name,
                    school_id: req.user.school_id,
                    sub_group_id: sub_group_id || null,
                }
            );

            const groupId = groupInsert.insertId;
            const attachedMembers: any[] = [];

            if (
                students &&
                Array.isArray(students) &&
                isValidArrayId(students) &&
                students.length > 0
            ) {
                const studentRows = await DB.query(
                    'SELECT id FROM Student WHERE id IN (:students) AND school_id = :school_id;',
                    {
                        students: students,
                        school_id: req.user.school_id,
                    }
                );

                if (studentRows.length > 0) {
                    const insertData = studentRows.map((student: any) => [
                        student.id,
                        groupId,
                    ]);
                    for (const row of insertData) {
                        const [student_id, group_id] = row;
                        await DB.execute(
                            `INSERT INTO GroupMember (student_id, group_id) VALUES (:student_id, :group_id)`,
                            { student_id, group_id }
                        );
                    }

                    const studentList = await DB.query(
                        `SELECT
                        st.id,st.phone_number,st.email,
                        st.student_number,st.given_name,st.family_name
                    FROM GroupMember AS gm
                    INNER JOIN Student as st ON gm.student_id = st.id
                    WHERE group_id = :group_id;`,
                        {
                            group_id: groupId,
                        }
                    );

                    attachedMembers.push(...studentList);
                }
            }

            return res
                .status(200)
                .json({
                    group: {
                        id: groupId,
                        name: name,
                        sub_group_id: sub_group_id || null,
                        members: attachedMembers,
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

    downloadCSVTemplate = async (req: ExtendedRequest, res: Response) => {
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
            console.error('Error generating CSV template:', e);
            return res.status(500).json({ error: 'internal_server_error' });
        }
    };

    getSubGroups = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_group_id',
                };
            }

            const groupExists = await DB.query(
                `SELECT id FROM StudentGroup WHERE id = :id AND school_id = :school_id`,
                {
                    id: groupId,
                    school_id: req.user.school_id,
                }
            );

            if (groupExists.length === 0) {
                throw {
                    status: 404,
                    message: 'group_not_found',
                };
            }

            const subGroups = await DB.query(
                `SELECT 
                    sg.id, 
                    sg.name, 
                    sg.created_at,
                    (SELECT COUNT(*) FROM GroupMember WHERE group_id = sg.id) as member_count
                FROM StudentGroup sg
                WHERE sg.sub_group_id = :group_id AND sg.school_id = :school_id
                ORDER BY sg.name`,
                {
                    group_id: groupId,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    sub_groups: subGroups,
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
}

export default GroupController;
