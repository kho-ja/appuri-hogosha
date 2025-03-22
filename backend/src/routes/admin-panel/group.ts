import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth'
import express, { NextFunction, Request, Response, Router } from "express";
import { generatePaginationLinks } from '../../utils/helper'
import DB from '../../utils/db-client'
import { isValidString, isValidId, isValidArrayId, isValidStudentNumber } from '../../utils/validate'
import process from "node:process";
import { stringify } from 'csv-stringify/sync';
import multer from 'multer';
import { Readable } from 'node:stream';
import csv from 'csv-parser';
import iconv from 'iconv-lite';

const storage = multer.memoryStorage();
const upload = multer({ storage });

class GroupController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/create', verifyToken, this.createGroup)
        this.router.get('/list', verifyToken, this.groupFilter)
        this.router.post('/ids', verifyToken, this.groupByIds)
        this.router.post('/upload', verifyToken, upload.single('file'), this.uploadGroupsFromCSV);
        this.router.get('/export', verifyToken, this.exportGroupsToCSV);

        this.router.get('/:id', verifyToken, this.groupView)
        this.router.delete('/:id', verifyToken, this.groupDelete)
        this.router.put('/:id', verifyToken, this.groupEdit)
    }

    exportGroupsToCSV = async (req: ExtendedRequest, res: Response) => {
        try {
            const groups = await DB.query(`SELECT
                id, name
                FROM StudentGroup
                WHERE school_id = :school_id`, {
                school_id: req.user.school_id
            });

            if (groups.length === 0) {
                return res.status(404).json({
                    error: 'No groups found'
                }).end();
            }

            for (const group of groups) {
                const memberList = await DB.query(`SELECT 
                    st.student_number
                    FROM GroupMember AS gm
                    INNER JOIN Student as st ON gm.student_id = st.id
                    WHERE gm.group_id = :group_id`, {
                    group_id: group.id
                })
                group.student_numbers = memberList.map((member: any) => member.student_number);
            }

            const csvData: any[] = [];
            for (const group of groups) {
                const student_numbers = group.student_numbers;
                const first = student_numbers.splice(0, 1);
                csvData.push({
                    name: group.name,
                    student_numbers: first[0]
                });
                for (const student_number of student_numbers) {
                    csvData.push({
                        student_numbers: student_number
                    });
                }
            }

            const csvContent = stringify(csvData, {
                header: true,
                columns: ['name', 'student_numbers']
            });

            res.setHeader('Content-Disposition', 'attachment; filename="groups.csv"');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
        } catch (e: any) {
            return res.status(500).json({
                error: 'Internal server error',
                details: e.message
            }).end();
        }
    }

    uploadGroupsFromCSV = async (req: ExtendedRequest, res: Response) => {
        const { throwInError, action, withCSV } = req.body
        const throwInErrorBool = throwInError === 'true'
        const withCSVBool = withCSV === 'true'
        const results: any[] = []
        const errors: any[] = []
        const inserted: any[] = []
        const updated: any[] = []
        const deleted: any[] = []
        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({
                    error: 'Bad Request',
                    details: 'File is missing or invalid'
                }).end()
            }
            const decodedContent = await iconv.decode(req.file.buffer, 'UTF-8')
            const stream = Readable.from(decodedContent)
            await new Promise((resolve, reject) => {
                stream
                    .pipe(csv())
                    .on('headers', (headers: any) => {
                        if (headers[0].charCodeAt(0) === 0xFEFF) {
                            headers[0] = headers[0].substring(1)
                        }
                    })
                    .on('data', (data: any) => {
                        if (Object.values(data).some((value: any) => value.trim() !== '')) {
                            results.push(data)
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject)
            })

            const validResults: any[] = []
            const existingGroupIdsInCSV: string[] = []
            const existingStudentNumbersInCSV: any = {}

            function addToExistingStudentNumbers(studentNumber: string, normalizedName: string) {
                if (Array.isArray(existingStudentNumbersInCSV[normalizedName])) {
                    existingStudentNumbersInCSV[normalizedName].push(studentNumber)
                } else {
                    existingStudentNumbersInCSV[normalizedName] = [studentNumber]
                }
            }

            for (const row of results) {
                const { name, student_numbers } = row
                const rowErrors: any = {}
                const normalizedName = String(name).trim()
                const normalizedStudentNumbers = String(student_numbers).trim();

                if (!isValidString(normalizedName)) rowErrors.name = 'Invalid name'
                if (!isValidStudentNumber(normalizedStudentNumbers)) rowErrors.student_numbers = 'Invalid student numbers';
                if (existingGroupIdsInCSV.includes(normalizedName)) {
                    rowErrors.name = 'This group name already exists'
                }
                if (existingStudentNumbersInCSV[normalizedName]?.includes(normalizedStudentNumbers)) {
                    rowErrors.student_numbers = 'This student number already exists'
                }

                if (Object.keys(rowErrors).length > 0) {
                    if (rowErrors.name && !rowErrors.student_numbers && validResults.length > 0) {
                        validResults.at(-1).student_numbers.push(normalizedStudentNumbers)
                        addToExistingStudentNumbers(normalizedStudentNumbers, normalizedName)
                    } else if (!rowErrors.name && normalizedStudentNumbers) {
                        validResults.push({
                            name: normalizedName,
                            student_numbers: [],
                        });
                    } else {
                        let error = errors.find(error => error.row.name === normalizedName);
                        if (error && error.errors.student_numbers === rowErrors.student_numbers) {
                            error.row.student_numbers.push(normalizedStudentNumbers)
                        } else {
                            errors.push({ row: { ...row, student_numbers: [row.student_numbers] }, errors: { student_numbers: rowErrors.student_numbers } })
                        }
                    }
                } else {
                    let group = validResults.find(group => group.name === normalizedName);
                    if (group) {
                        group.student_numbers.push(normalizedStudentNumbers)
                        addToExistingStudentNumbers(normalizedStudentNumbers, normalizedName)
                    } else {
                        row.name = normalizedName
                        row.student_numbers = [normalizedStudentNumbers]
                        existingGroupIdsInCSV.push(row.name)
                        addToExistingStudentNumbers(normalizedStudentNumbers, normalizedName)
                        validResults.push(row)
                    }
                }
            }

            if (errors.length > 0 && throwInErrorBool) {
                return res.status(400).json({ errors: errors }).end()
            }
            const groupNames = validResults.map(row => row.name)
            if (groupNames.length === 0) {
                return res.status(400).json({
                    errors: errors,
                    message: 'All data invalid'
                }).end()
            }
            const existingGroups = await DB.query('SELECT name FROM StudentGroup WHERE name IN (:groupNames)', {
                groupNames,
            })
            const existingGroupNames = existingGroups.map((group: any) => group.name)
            if (action === 'create') {
                for (const row of validResults) {
                    if (existingGroupNames.includes(row.name)) {
                        errors.push({ row, errors: { name: 'Group already exists' } })
                    } else {
                        const groupInsert = await DB.execute(
                            `INSERT INTO StudentGroup(name, created_at, school_id)
                            VALUE (:name, NOW(), :school_id);`, {
                            name: row.name,
                            school_id: req.user.school_id,
                        })
                        const groupId = groupInsert.insertId
                        const attachedMembers: any[] = [];

                        if (row.student_numbers && Array.isArray(row.student_numbers) && row.student_numbers.length > 0) {
                            const studentRows = await DB.query(`SELECT id
                                    FROM Student WHERE student_number IN (:student_number)
                                    GROUP BY student_number`, {
                                student_number: row.student_numbers
                            })

                            if (studentRows.length > 0) {
                                const values = studentRows.map((student: any) => `(${groupId}, ${student.id})`).join(', ');
                                await DB.execute(`INSERT INTO GroupMember (group_id, student_id) VALUES ${values}`);

                                const studentList = await DB.query(`SELECT st.id,st.given_name, st.family_name
                                        FROM Student as st
                                        INNER JOIN GroupMember as gm
                                        ON gm.student_id = st.id AND gm.group_id = :group_id`, {
                                    group_id: groupId,
                                })

                                attachedMembers.push(...studentList);
                            } else {
                                errors.push({ row, errors: { student_numbers: 'Invalid student numbers' } });
                            }
                        }
                        inserted.push({ ...row, members: attachedMembers })
                    }
                }
            } else if (action === 'update') {
                for (const row of validResults) {
                    if (!existingGroupNames.includes(row.name)) {
                        errors.push({ row, errors: { name: 'Group does not exist' } })
                    } else {
                        await DB.execute(
                            `UPDATE StudentGroup SET
                            name = :name
                            WHERE name = :name AND school_id = school_id`, {
                            name: row.name,
                            school_id: req.user.school_id,
                        })

                        const attachedMembers: any[] = [];
                        if (row.student_numbers && Array.isArray(row.student_numbers) && row.student_numbers.length > 0) {
                            const groupId = (await DB.query(`SELECT id FROM StudentGroup WHERE name = :name`, {
                                name: row.name,
                            }))[0].id;

                            const existingStudents = await DB.query(`SELECT st.id, st.student_number 
                                FROM GroupMember AS gm 
                                INNER JOIN Student as st 
                                ON gm.student_id = st.id
                                WHERE gm.group_id = :group_id`, {
                                group_id: groupId,
                            })
                            const futureStudents = await DB.query(`SELECT id, student_number FROM Student WHERE student_number IN (:student_numbers)`, {
                                student_numbers: row.student_numbers
                            })

                            const deletedStudents = existingStudents.filter((existing: any) => !futureStudents.some((future: any) => future.student_number === existing.student_number));
                            const newStudents = futureStudents.filter((future: any) => !existingStudents.some((existing: any) => existing.student_number === future.student_number));

                            if (deletedStudents.length > 0) {
                                for (const student of deletedStudents) {
                                    await DB.execute(`DELETE FROM GroupMember WHERE group_id = :group_id AND student_id = :student_id`, {
                                        group_id: groupId,
                                        student_id: student.id
                                    });
                                }
                            }

                            if (newStudents.length > 0) {
                                const values = newStudents.map((student: any) => `(${student.id}, ${groupId})`).join(', ');
                                await DB.execute(`INSERT INTO GroupMember (student_id, group_id) VALUES ${values}`);
                                attachedMembers.push(...newStudents);
                            }

                            if (deletedStudents.length <= 0 && newStudents.length <= 0 && futureStudents.length <= 0) {
                                errors.push({ row, errors: { student_numbers: 'Invalid student numbers' } });
                            }
                        }
                        updated.push({ ...row, members: attachedMembers })
                    }
                }
            } else if (action === 'delete') {
                for (const row of validResults) {
                    if (!existingGroupNames.includes(row.name)) {
                        errors.push({ row, errors: { name: 'Group does not exist' } })
                    } else {
                        await DB.execute('DELETE FROM StudentGroup WHERE name = :name AND school_id = :school_id', {
                            name: row.name,
                            school_id: req.user.school_id,
                        })
                        deleted.push(row)
                    }
                }
            } else {
                return res.status(400).json({
                    error: 'Bad Request',
                    details: 'Invalid action'
                }).end()
            }
            if (errors.length > 0) {
                let csvFile: Buffer | null = null
                if (withCSVBool) {
                    const csvData = errors.map((error: any) => ({
                        name: error?.row?.name,
                        student_numbers: Array.isArray(error?.row?.student_numbers) ? error?.row?.student_numbers?.join(", ") : error?.row?.student_numbers,
                    }))
                    const csvContent = stringify(csvData, {
                        header: true,
                        columns: ['name', 'student_numbers']
                    })
                    // response headers for sending multipart files to send it with json response
                    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
                    res.setHeader('Content-Disposition', 'attachment; filename=errors.csv')
                    csvFile = Buffer.from('\uFEFF' + csvContent, 'utf-8')
                }
                return res.status(400).json({
                    message: 'CSV processed successfully but with errors',
                    inserted: inserted,
                    updated: updated,
                    deleted: deleted,
                    errors: errors.length > 0 ? errors : null,
                    csvFile: csvFile,
                }).end()
            }
            return res.status(200).json({
                message: 'CSV processed successfully',
                inserted: inserted,
                updated: updated,
                deleted: deleted,
            }).end()
        } catch (e: any) {
            return res.status(500).json({
                error: 'Internal server error',
                details: e.message
            }).end()
        }
    }

    groupEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }
            const groupInfo = await DB.query(`SELECT
                    id, name, created_at, school_id
                    FROM StudentGroup
                    WHERE id = :id AND school_id = :school_id`, {
                id: groupId,
                school_id: req.user.school_id
            });

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Student not found'
                }
            }

            const group = groupInfo[0];

            const {
                name,
                students
            } = req.body


            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group name'
                }
            }

            await DB.execute('UPDATE StudentGroup SET name = :name WHERE id = :id', {
                id: group.id,
                name: name
            });

            if (students && Array.isArray(students) && isValidArrayId(students)) {
                const existMembers = await DB.query(`SELECT student_id
                    FROM GroupMember
                    WHERE group_id = :group_id;`, {
                    group_id: group.id
                })

                const existMemberIds = existMembers.map((student: any) => student.student_id);
                const insertStudentIds = students.filter((id: any) => !existMemberIds.includes(id));
                const deleteStudentIds = existMemberIds.filter((id: any) => !students.includes(id));

                if (deleteStudentIds.length > 0) {
                    await DB.query(`DELETE FROM GroupMember 
                        WHERE group_id = :group_id AND student_id IN (:studentIds);`, {
                        group_id: group.id,
                        studentIds: deleteStudentIds
                    });

                    await DB.query(`DELETE FROM PostStudent AS ps
                        WHERE ps.student_id IN (:studentIds) AND ps.group_id = :group_id;`, {
                        group_id: group.id,
                        studentIds: deleteStudentIds
                    });
                }

                if (insertStudentIds.length > 0) {
                    const insertData = insertStudentIds.map((studentId: any) => ({
                        student_id: studentId,
                        group_id: group.id
                    }));
                    const valuesString = insertData.map((item: any) => `(${item.student_id}, ${item.group_id})`).join(', ');
                    await DB.query(`INSERT INTO GroupMember (student_id, group_id)
                        VALUES ${valuesString};`);
                }

            }


            return res.status(200).json({
                message: 'Group changed successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    groupDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }
            const groupInfo = await DB.query(`SELECT
                    id, name, created_at, school_id
                    FROM StudentGroup
                    WHERE id = :id AND school_id = :school_id`, {
                id: groupId,
                school_id: req.user.school_id
            });

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Student not found'
                }
            }

            await DB.execute('DELETE FROM StudentGroup WHERE id = :id;', {
                id: groupId
            })

            return res.status(200).json({
                message: 'Group deleted successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    groupByIds = async (req: ExtendedRequest, res: Response) => {
        try {
            const { groupIds } = req.body

            if (groupIds && Array.isArray(groupIds) && isValidArrayId(groupIds)) {
                const groupList = await DB.query(`SELECT id,name FROM StudentGroup 
                    WHERE id IN (:groups) AND school_id = :school_id;`, {
                    groups: groupIds,
                    school_id: req.user.school_id,
                })

                return res.status(200).json({
                    groupList
                }).end();
            } else {
                throw {
                    status: 401,
                    message: 'Invalid id list'
                }
            }
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    groupView = async (req: ExtendedRequest, res: Response) => {
        try {
            const groupId = req.params.id;

            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }
            const groupInfo = await DB.query(`SELECT id,name,created_at FROM StudentGroup 
                WHERE id = :id AND school_id = :school_id`, {
                id: groupId,
                school_id: req.user.school_id
            });

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Group not found'
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
                group_id: group.id,
                limit: limit,
                offset: offset
            };

            if (email) {
                filters.push('st.email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('st.student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause = filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const groupMembers = await DB.query(`SELECT
                    st.id,st.phone_number,st.email,
                    st.student_number, st.given_name, st.family_name
                FROM GroupMember AS gm
                INNER JOIN Student AS st on gm.student_id = st.id
                WHERE gm.group_id = :group_id ${whereClause}
                ORDER BY gm.id DESC
                LIMIT :limit OFFSET :offset;`, params)

            const totalMembers = (await DB.query(`SELECT COUNT(*) as total
                FROM GroupMember as gm
                INNER JOIN Student AS st on gm.student_id = st.id
                WHERE gm.group_id = :group_id ${whereClause};`, params))[0].total

            const totalPages = Math.ceil(totalMembers / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_members: totalMembers,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };


            return res.status(200).json({
                group: group,
                members: groupMembers,
                pagination: pagination
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    groupFilter = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const name = req.query.name as string || '';

            const filters: string[] = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset
            };

            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause = filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const groupList = await DB.query(`SELECT sg.id, sg.name,
                (SELECT COUNT(*) AS total FROM GroupMember WHERE group_id = sg.id) as member_count
                FROM StudentGroup as sg
                WHERE sg.school_id = :school_id ${whereClause}
                ORDER BY sg.id DESC
                LIMIT :limit OFFSET :offset;`, params);

            const totalGroups = (await DB.query(`SELECT COUNT(*) as total
                FROM StudentGroup AS sg WHERE sg.school_id = :school_id ${whereClause};`, params))[0].total

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
                groups: groupList,
                pagination: pagination
            }).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    createGroup = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                name,
                students
            } = req.body


            if (!name || !isValidString(name)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group name'
                }
            }


            const groupInsert = await DB.execute(
                `INSERT INTO StudentGroup(name, created_at, school_id) 
                        VALUE (:name, NOW(), :school_id);`, {
                name: name,
                school_id: req.user.school_id,
            });

            const groupId = groupInsert.insertId;
            const attachedMembers: any[] = [];

            if (students && Array.isArray(students) && isValidArrayId(students)
                && students.length > 0) {
                const studentRows = await DB.query('SELECT id FROM Student WHERE id IN (:students) AND school_id = :school_id;', {
                    students: students,
                    school_id: req.user.school_id,
                })


                if (studentRows.length > 0) {
                    const values = studentRows.map((student: any) => `(${student.id}, ${groupId})`).join(', ');
                    await DB.execute(`INSERT INTO GroupMember(student_id, group_id) VALUES ${values}`);

                    const studentList = await DB.query(`SELECT 
                                st.id,st.phone_number,st.email,
                                st.student_number,st.given_name,st.family_name 
                            FROM GroupMember AS gm
                            INNER JOIN Student as st ON gm.student_id = st.id
                            WHERE group_id = :group_id;`, {
                        group_id: groupId,
                    })

                    attachedMembers.push(...studentList);
                }
            }

            return res.status(200).json({
                group: {
                    id: groupId,
                    name: name,
                    members: attachedMembers
                }
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }
}

export default GroupController