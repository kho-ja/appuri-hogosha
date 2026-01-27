import { Response, Router } from 'express';

import { IController } from '../../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../../middlewares/mobileAuth';
import { mobileStudentService } from './student.service';

export class MobileStudentModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get('/students', verifyToken, this.studentList);
        this.router.get('/unread', verifyToken, this.unreadStudentList);
    }

    unreadStudentList = async (req: ExtendedRequest, res: Response) => {
        try {
            const students = await mobileStudentService.listUnread(req.user.id);

            return res.status(200).json(students).end();
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

    studentList = async (req: ExtendedRequest, res: Response) => {
        try {
            const students = await mobileStudentService.listStudents(
                req.user.id
            );

            return res.status(200).json(students).end();
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

export default MobileStudentModuleController;
