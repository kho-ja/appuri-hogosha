import express, { Router } from 'express';

import { PostModuleController } from '../../modules/post/post.controller';
import { IController } from '../../utils/icontroller';

class PostController implements IController {
    public router: Router = express.Router();
    private postModule: PostModuleController;

    constructor() {
        this.postModule = new PostModuleController();
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', this.postModule.router);
    }
}

export default PostController;
