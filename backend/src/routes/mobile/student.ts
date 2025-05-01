import { IController } from '../../utils/icontroller';
import { Response, Router } from "express";
import { ExtendedRequest, verifyToken } from '../../middlewares/mobileAuth'
import DB from '../../utils/db-client'

class StudentController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.get('/students', verifyToken, this.studentList)
        this.router.get('/unread', verifyToken, this.unreadStudentList)
    }

    unreadStudentList = async (req: ExtendedRequest, res: Response) => {
        try {
            const students = await DB.query(`SELECT
                st.id,
                (SELECT COUNT(*)
                 FROM PostParent pp
                 INNER JOIN PostStudent ps ON pp.post_student_id = ps.id
                 INNER JOIN Post po ON ps.post_id = po.id
                 WHERE pp.parent_id = sp.parent_id
                 AND ps.student_id = sp.student_id
                 AND pp.viewed_at IS NULL) AS unread_count
            FROM StudentParent AS sp
            INNER JOIN Student AS st ON st.id = sp.student_id
            WHERE sp.parent_id = :parent_id;`, {
                parent_id: req.user.id,
            });
            console.log('unread' , students)

            return res.status(200).json(students).end()
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

    studentList = async (req: ExtendedRequest, res: Response) => {
        try {
            const students = await DB.query(`
                        SELECT 
                            st.id,
                            st.family_name,
                            st.given_name,
                            st.student_number,
                            st.email,
                            st.phone_number,
                            COUNT(DISTINCT ps.id) AS messageCount,
                            COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.id END) AS unread_count
                        FROM StudentParent AS sp
                        INNER JOIN Student AS st ON st.id = sp.student_id
                        LEFT JOIN PostStudent AS ps ON ps.student_id = st.id
                        LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id 
                            AND pp.parent_id = sp.parent_id
                        WHERE sp.parent_id = :parent_id
                        GROUP BY st.id, st.family_name, st.given_name, st.student_number, st.email, st.phone_number;
            `, {
                parent_id: req.user.id,
            });
            
            return res.status(200).json(students).end()
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

export default StudentController