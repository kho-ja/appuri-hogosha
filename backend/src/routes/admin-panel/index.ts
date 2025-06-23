import AuthController from "./auth";
import StudentController from "./student";
import ParentController from "./parent";
import PostController from "./post";
import SchedulePostController from "./schedule";
import AdminController from "./admin";
import GroupController from "./group";
import FormController from "./form";
import SchoolController from "./school";
import { Router } from "express";
import { IController } from "utils/icontroller";

console.log('starting AdminPanel');

class AdminPanelController implements IController {
    public router: Router = Router();
    public path?: string | undefined = "/admin-panel";

    constructor() {
        this.initRoutes()
    }

    initRoutes() {
        this.router.use(new AuthController().router);
        this.router.use('/student', new StudentController().router);
        this.router.use('/parent', new ParentController().router);
        this.router.use('/post', new PostController().router);
        this.router.use('/schedule', new SchedulePostController().router);
        this.router.use('/admin', new AdminController().router);
        this.router.use('/group', new GroupController().router);
        this.router.use('/form', new FormController().router);
        this.router.use('/school', new SchoolController().router);
    }
}

export default AdminPanelController;