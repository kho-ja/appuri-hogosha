import { Router } from 'express';

import mobilePostRouter from '../../modules/mobile/post';
import { IController } from '../../utils/icontroller';

class PostController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.use('/', mobilePostRouter);
    }
}

export default PostController;
