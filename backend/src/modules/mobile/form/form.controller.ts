import { Response, Router } from 'express';

import { IController } from '../../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../../middlewares/mobileAuth';
import { mobileFormService } from './form.service';

export class MobileFormModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/create/forms', verifyToken, this.createForm);
        this.router.post('/forms', verifyToken, this.formList);
    }

    formList = async (req: ExtendedRequest, res: Response) => {
        try {
            const { student_id, last_form_id } = req.body;

            const forms = await mobileFormService.listForms({
                parentId: req.user.id,
                studentId: student_id,
                lastFormId: last_form_id,
            });

            return res.status(200).json(forms).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            }
            return res
                .status(500)
                .json({ error: 'Internal server error' })
                .end();
        }
    };

    createForm = async (req: ExtendedRequest, res: Response) => {
        try {
            const { reason, additional_message, date, student_id } = req.body;

            await mobileFormService.createForm({
                parentId: req.user.id,
                schoolId: req.user.school_id,
                reason,
                additional_message,
                date,
                studentId: student_id,
            });

            return res
                .status(200)
                .json({ message: 'Form successfully created' })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            }
            return res
                .status(500)
                .json({ error: 'Internal server error' })
                .end();
        }
    };
}

export default MobileFormModuleController;
