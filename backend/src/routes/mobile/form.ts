import { IController } from '../../utils/icontroller';
import { Response, Router } from "express";
import { ExtendedRequest, verifyToken } from '../../middlewares/mobileAuth'
import DB from '../../utils/db-client'
import { isValidString, isValidReason, isValidDate } from '../../utils/validate'
import process from "node:process";

class FormController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/create/forms', verifyToken, this.createForm)
        this.router.post('/forms', verifyToken, this.formList)
    }

    formList = async (req: ExtendedRequest, res: Response) => {
        try {
            const { student_id, last_form_id } = req.body;
            let forms;
            if (last_form_id == 0) {
                forms = await DB.query(`SELECT id,reason,additional_message,date,student_id FROM Form
                        WHERE student_id = :student_id AND parent_id = :parent_id
                        ORDER BY sent_at DESC
                        LIMIT :limit`, {
                    parent_id: req.user.id,
                    student_id: student_id,
                    limit: parseInt(process.env.PER_PAGE + '')
                });
            } else {
                forms = await DB.query(`SELECT id,reason,additional_message,date,student_id FROM Form
                        WHERE student_id = :student_id AND parent_id = :parent_id
                        AND id < :last_form_id
                        ORDER BY sent_at DESC
                        LIMIT :limit`, {
                    parent_id: req.user.id,
                    student_id: student_id,
                    last_form_id: last_form_id,
                    limit: parseInt(process.env.PER_PAGE + '')
                });
            }

            const formList = forms.map((form: any) => {
                form.status = 'waiting'
                return form
            })

            return res.status(200).json(formList).end()
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

    createForm = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                reason, additional_message, date, student_id
            } = req.body;
            let additional_information = additional_message

            if (!reason || !isValidReason(reason)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing reason'
                }
            }
            if (!date || !isValidDate(date)) {
                throw {
                    status: 401,
                    message: 'Invalid or date'
                }
            }

            if (additional_message) {
                if (!isValidString(additional_message)) {
                    throw {
                        status: 401,
                        message: 'Invalid or date'
                    }
                }
            } else if (!additional_message) {
                additional_information = ''
            }

            const studentRelation = await DB.query(`SELECT id FROM StudentParent
                WHERE parent_id = :parent_id AND student_id = :student_id;`, {
                parent_id: req.user.id,
                student_id: student_id,
            })

            if (studentRelation.length <= 0) {
                throw {
                    status: 401,
                    message: 'Invalid student_id'
                }
            }


            await DB.execute(`INSERT INTO Form(student_id, parent_id, reason, date, additional_message, sent_at, school_id)
                VALUE (:student_id, :parent_id, :reason, :date, :additional_message, NOW(), :school_id)`, {
                student_id: student_id,
                parent_id: req.user.id,
                reason: reason,
                date: date,
                additional_message: additional_information,
                school_id: req.user.school_id,
            })


            return res.status(200).json({
                message: 'Form successfully created'
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