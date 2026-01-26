import express, { Router } from 'express';

import { IController } from '../../utils/icontroller';

import PostModuleController from '../../modules/post/post.controller';

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
