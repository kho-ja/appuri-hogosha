import {IController} from '../utils/icontroller';
import {ExtendedRequest, verifyToken} from '../middlewares/auth'
import express, {Response, Router} from "express";

import DB from '../utils/db-client'
import {
    isValidStatus,
    isValidId,
    isValidReason
} from '../utils/validate'
import process from "node:process";
import {generatePaginationLinks} from "../utils/helper";

class FormController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.get('/form/list', verifyToken, this.formList)
        this.router.get('/form/count', verifyToken, this.formCount)
        this.router.get('/form/:id', verifyToken, this.formView)
        this.router.put('/form/:id', verifyToken, this.formEdit)
    }

    formCount = async (req: ExtendedRequest, res: Response) => {
        try {
            const formCount = (await DB.query(`SELECT COUNT(*) as total
                FROM Form WHERE school_id = :school_id AND status = 'wait';`, {
                school_id: req.user.school_id,
            }))[0].total

            return res.status(200).json({
                form_count: formCount
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

    formList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const reason = req.query.reason as string || '';
            const status = req.query.status as string || '';

            const filters = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset
            };

            if (reason && isValidReason(reason)) {
                filters.push('fo.reason = :reason');
                params.reason = reason;
            }
            if (status && isValidStatus(status)) {
                filters.push('fo.status = :status');
                params.status = status;
            }


            const whereClause = filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

            const formList = await DB.query(`SELECT
                fo.id, fo.reason, DATE_FORMAT(fo.date, '%Y-%m-%d') AS date, fo.additional_message, 
                DATE_FORMAT(fo.sent_at, '%Y-%m-%d %H:%i:%s') AS sent_at, fo.status,
                pa.id AS parent_id, pa.family_name AS parent_family_name, pa.given_name AS parent_given_name,
                st.id AS student_id, st.family_name AS student_family_name, st.given_name AS student_given_name
            FROM Form AS fo
            INNER JOIN Parent AS pa ON fo.parent_id = pa.id
            INNER JOIN Student AS st ON fo.student_id = st.id
            WHERE fo.school_id = :school_id ${whereClause}
            ORDER BY id DESC
            LIMIT :limit OFFSET :offset;`, params);

            const totalForms = (await DB.query(`SELECT COUNT(*) as total
                FROM Form AS fo WHERE school_id = :school_id ${whereClause};`, params))[0].total

            const totalPages = Math.ceil(totalForms / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_forms: totalForms,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const formattedFormList = formList.map((form: any) => ({
                id: form.id,
                reason: form.reason,
                date: form.date,
                additional_message: form.additional_message,
                sent_at: form.sent_at,
                status: form.status,
                parent: {
                    id: form.parent_id,
                    family_name: form.parent_family_name,
                    given_name: form.parent_given_name
                },
                student: {
                    id: form.student_id,
                    family_name: form.student_family_name,
                    given_name: form.student_given_name
                }
            }));


            return res.status(200).json({
                forms: formattedFormList,
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

    formView = async (req: ExtendedRequest, res: Response) => {
        try {
            const formId = req.params.id;

            if (!formId || !isValidId(formId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing form id'
                }
            }
            const formInfo = await DB.query(`SELECT
                    fo.id, fo.reason, DATE_FORMAT(fo.date, '%Y-%m-%d') AS date, fo.additional_message,
                    DATE_FORMAT(fo.sent_at, '%Y-%m-%d %H:%i:%s') AS sent_at, fo.status,
                
                    pa.id AS parent_id, pa.family_name AS parent_family, pa.given_name as parent_given,
                    pa.phone_number AS parent_number,
                
                    st.id AS student_id, st.family_name AS student_family, st.given_name as student_given,
                    st.phone_number AS student_phone_number, st.student_number AS student_number
                FROM Form AS fo
                INNER JOIN Parent AS pa ON fo.parent_id = pa.id
                INNER JOIN Student AS st ON fo.student_id = st.id
                WHERE fo.school_id = :school_id AND fo.id = :id`, {
                id: formId,
                school_id: req.user.school_id
            });

            if (formInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Form not found'
                }
            }

            const form = formInfo[0];

            return res.status(200).json({
                form: {
                    id: form.id,
                    reason: form.reason,
                    date: form.date,
                    additional_message: form.additional_message,
                    sent_at: form.sent_at,
                    status: form.status
                },
                student: {
                    id: form.student_id,
                    family_name: form.student_family,
                    given_name: form.student_given,
                    phone_number: form.student_phone_number,
                    student_number: form.student_number
                },
                parent: {
                    id: form.parent_id,
                    family_name: form.parent_family,
                    given_name: form.parent_given,
                    phone_number: form.parent_number
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

    formEdit = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                status,
            } = req.body

            if (!status || !isValidStatus(status)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing status'
                }
            }

            const formId = req.params.id;

            if (!formId || !isValidId(formId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing form id'
                }
            }
            const formInfo = await DB.query(`SELECT
                    fo.id, fo.reason, DATE_FORMAT(fo.date, '%Y-%m-%d') AS date, fo.additional_message,
                    DATE_FORMAT(fo.sent_at, '%Y-%m-%d %H:%i:%s') AS sent_at, fo.status,
                
                    pa.id AS parent_id, pa.family_name AS parent_family, pa.given_name as parent_given,
                    pa.phone_number AS parent_number,
                
                    st.id AS student_id, st.family_name AS student_family, st.given_name as student_given,
                    st.phone_number AS student_phone_number, st.student_number AS student_number
                FROM Form AS fo
                INNER JOIN Parent AS pa ON fo.parent_id = pa.id
                INNER JOIN Student AS st ON fo.student_id = st.id
                WHERE fo.school_id = :school_id AND fo.id = :id;`, {
                id: formId,
                school_id: req.user.school_id
            });

            if (formInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Form not found'
                }
            }

            const form = formInfo[0];

            await DB.execute(
                `UPDATE Form SET
                        status = :status
                    WHERE id = :id`, {
                    status: status,
                    id: formId
                });

            return res.status(200).json({
                form: {
                    id: form.id,
                    reason: form.reason,
                    date: form.date,
                    additional_message: form.additional_message,
                    sent_at: form.sent_at,
                    status: status
                },
                student: {
                    id: form.student_id,
                    family_name: form.student_family,
                    given_name: form.student_given,
                    phone_number: form.student_phone_number,
                    student_number: form.student_number
                },
                parent: {
                    id: form.parent_id,
                    family_name: form.parent_family,
                    given_name: form.parent_given,
                    phone_number: form.parent_number
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

export default FormController