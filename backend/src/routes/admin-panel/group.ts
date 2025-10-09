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

// Using shared CSV upload middleware from utils/csv-upload

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
    }

    exportGroupsToCSV = async (req: ExtendedRequest, res: Response) => {
        try {
            const groups = await DB.query(
                `SELECT
                id, name
                FROM StudentGroup
                WHERE school_id = :school_id`,
                {
                    school_id: req.user.school_id,
                }
            );

            if (groups.length === 0) {
                return res
                    .status(404)
                    .json({
                        error: 'No groups found',
                    })
                    .end();
            }

            for (const group of groups) {
                const memberList = await DB.query(
                    `SELECT
                    st.student_number
                    FROM GroupMember AS gm
                    INNER JOIN Student as st ON gm.student_id = st.id
                    WHERE gm.group_id = :group_id`,
                    {
                        group_id: group.id,
                    }
                );
                group.student_numbers = memberList.map(
                    (member: any) => member.student_number
                );
            }

            const csvData: any[] = [];
            for (const group of groups) {
                const student_numbers = group.student_numbers;
                const first = student_numbers.splice(0, 1);
                csvData.push({
                    name: group.name,
                    student_numbers: first[0],
                });
                for (const student_number of student_numbers) {
                    csvData.push({
                        student_numbers: student_number,
                    });
                }
            }

            const csvContent = stringify(csvData, {
                header: true,
                columns: ['name', 'student_numbers'],
            });

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="groups.csv"'
            );
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
        } catch (e: any) {
            return res
                .status(500)
                .json({
                    error: 'Internal server error',
                    details: e.message,
                })
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
        // Response container
        const response = createBaseResponse<any>();
        try {
            const rows = await parseCSVBuffer(req.file.buffer);
            if (rows.length === 0) {
                response.message = ErrorKeys.csv_is_empty_but_valid;
                return res.status(200).json(response).end();
            }

            // Merge logic similar to previous implementation
            interface GroupRow extends CSVRowBase {
                name: string;
                student_numbers: string[];
            }
            const validGroups: GroupRow[] = [];
            const errors: RowError<GroupRow>[] = [];

            for (const raw of rows) {
                const name = String(raw.name || '').trim();
                const snRaw = String(raw.student_numbers || '').trim();
                const numbers = snRaw
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                const rowErrors: Record<string, string> = {};
                if (!isValidString(name))
                    rowErrors.name = ErrorKeys.invalid_name;
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
                    // Attempt to merge student numbers into previous valid group with same name if only name invalid logic isn't triggered
                    const existingValid = validGroups.find(
                        g => g.name === name
                    );
                    if (existingValid && !rowErrors.student_numbers) {
                        existingValid.student_numbers.push(...numbers);
                    } else {
                        // add error row (store numbers even if some invalid for diagnostic)
                        errors.push({
                            row: { name, student_numbers: numbers },
                            errors: rowErrors,
                        });
                    }
                } else {
                    const existing = validGroups.find(g => g.name === name);
                    if (existing) existing.student_numbers.push(...numbers);
                    else validGroups.push({ name, student_numbers: numbers });
                }
            }

            // Deduplicate numbers
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

            const existingGroups = await DB.query(
                'SELECT name FROM StudentGroup WHERE name IN (:names)',
                { names: validGroups.map(g => g.name) }
            );
            const existingSet = new Set(existingGroups.map((g: any) => g.name));

            for (const group of validGroups) {
                if (action === 'create') {
                    if (existingSet.has(group.name)) {
                        response.errors.push({
                            row: group,
                            errors: {
                                name: ErrorKeys.group_name_already_exists,
                            },
                        });
                        continue;
                    }
                    const insert = await DB.execute(
                        `INSERT INTO StudentGroup(name, created_at, school_id)
                         VALUE (:name, NOW(), :school_id);`,
                        { name: group.name, school_id: req.user.school_id }
                    );
                    const groupId = insert.insertId;
                    const attachedMembers: any[] = [];
                    if (group.student_numbers.length) {
                        const studentRows = await DB.query(
                            `SELECT id, student_number FROM Student WHERE student_number IN (:sns)`,
                            { sns: group.student_numbers }
                        );
                        if (studentRows.length) {
                            for (const st of studentRows) {
                                await DB.execute(
                                    `INSERT INTO GroupMember (group_id, student_id) VALUES (:group_id, :student_id)`,
                                    { group_id: groupId, student_id: st.id }
                                );
                            }
                            attachedMembers.push(...studentRows);
                        } else {
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
                        members: attachedMembers,
                    });
                } else if (action === 'update') {
                    if (!existingSet.has(group.name)) {
                        response.errors.push({
                            row: group,
                            errors: { name: ErrorKeys.group_does_not_exist },
                        });
                        continue;
                    }
                    await DB.execute(
                        `UPDATE StudentGroup SET name = :name WHERE name = :name AND school_id = :school_id`,
                        {
                            name: group.name,
                            school_id: req.user.school_id,
                        }
                    );
                    if (group.student_numbers.length) {
                        const gId = (
                            await DB.query(
                                `SELECT id FROM StudentGroup WHERE name = :name AND school_id = :school_id`,
                                {
                                    name: group.name,
                                    school_id: req.user.school_id,
                                }
                            )
                        )[0].id;
                        const existingStudents = await DB.query(
                            `SELECT st.id, st.student_number
                             FROM GroupMember gm
                             INNER JOIN Student st ON gm.student_id = st.id
                             WHERE gm.group_id = :gid`,
                            { gid: gId }
                        );
                        const futureStudents = await DB.query(
                            `SELECT id, student_number FROM Student WHERE student_number IN (:sns)`,
                            { sns: group.student_numbers }
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
                        if (
                            !deleted.length &&
                            !added.length &&
                            !futureStudents.length
                        ) {
                            response.errors.push({
                                row: group,
                                errors: {
                                    student_numbers:
                                        ErrorKeys.invalid_student_numbers,
                                },
                            });
                            continue;
                        }
                        response.updated.push({
                            ...group,
                            members: futureStudents,
                        });
                    } else {
                        response.updated.push({ ...group, members: [] });
                    }
                } else if (action === 'delete') {
                    if (!existingSet.has(group.name)) {
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

            const group = groupInfo[0];

            const { name, students } = req.body;

            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_name',
                };
            }

            await DB.execute(
                'UPDATE StudentGroup SET name = :name WHERE id = :id',
                {
                    id: group.id,
                    name: name,
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
                    // Validate that all student IDs are valid integers
                    if (!isValidArrayId(insertStudentIds)) {
                        throw {
                            status: 400,
                            message: 'invalid_student_id',
                        };
                    }

                    // Use safe bulk insert with parameterized queries
                    const insertData = insertStudentIds.map(
                        (studentId: any) => [
                            Number(studentId), // Ensure it's a number
                            group.id,
                        ]
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
                `SELECT id,name,created_at FROM StudentGroup
                WHERE id = :id AND school_id = :school_id`,
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
                    st.student_number, st.given_name, st.family_name
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
                    st.student_number, st.given_name, st.family_name
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

            const name = (req.query.name as string) || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
            };

            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause =
                filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const groupList = await DB.query(
                `SELECT sg.id, sg.name,
                (SELECT COUNT(*) AS total FROM GroupMember WHERE group_id = sg.id) as member_count
                FROM StudentGroup as sg
                WHERE sg.school_id = :school_id ${whereClause}
                ORDER BY sg.id DESC
                LIMIT :limit OFFSET :offset;`,
                params
            );

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
            const { name, students } = req.body;

            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'invalid_or_missing_group_name',
                };
            }

            // Check if the group name already exists
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
                `INSERT INTO StudentGroup(name, created_at, school_id)
                VALUE (:name, NOW(), :school_id);`,
                {
                    name: name,
                    school_id: req.user.school_id,
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
                    // Use safe bulk insert instead of string interpolation
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
            const headers = ['name', 'student_numbers'];

            const csvContent = stringify([headers], {
                header: false,
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
}

export default GroupController;
