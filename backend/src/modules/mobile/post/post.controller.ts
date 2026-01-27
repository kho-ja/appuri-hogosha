import { Response, Router } from 'express';

import { IController } from '../../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../../middlewares/mobileAuth';
import { mobilePostService } from './post.service';

export class MobilePostModuleController implements IController {
    public router: Router = Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post('/posts', verifyToken, this.posts);
        this.router.get('/posts/:id', verifyToken, this.post);
        this.router.post('/view', verifyToken, this.viewPost);
        this.router.post('/view/extended', verifyToken, this.viewExtended);
        this.router.get('/post/:post_id', verifyToken, this.getPostData);
    }

    getPostData = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_id } = req.params;

            const post = await mobilePostService.getPostData({
                postParentId: post_id,
                parentId: req.user.id,
            });

            if (post.length === 0) {
                return res.status(404).json({ error: 'Post not found' }).end();
            }

            return res.status(200).json({ post: post[0] }).end();
        } catch (e: any) {
            console.error('Error fetching post data:', e);
            return res
                .status(500)
                .json({ error: 'Internal server error' })
                .end();
        }
    };

    post = async (req: ExtendedRequest, res: Response) => {
        try {
            const { id: post_id } = req.params;
            const { student_id } = req.body;

            const post = await mobilePostService.getPost({
                postId: post_id,
                parentId: req.user.id,
                studentId: student_id,
            });

            if (post.length === 0) {
                return res.status(404).json(post).end();
            }

            await mobilePostService.markPostViewedByPostId(post_id);

            post[0].images = [];

            return res
                .status(200)
                .json({
                    post: post[0],
                    message: 'Successfully fetched post',
                })
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

    posts = async (req: ExtendedRequest, res: Response) => {
        try {
            const { student_id, last_post_id, last_sent_at, read_post_ids } =
                req.body;

            const posts = await mobilePostService.listPosts({
                parentId: req.user.id,
                studentId: student_id,
                lastPostId: last_post_id,
                lastSentAt: last_sent_at,
                readPostIds: read_post_ids,
            });

            return res
                .status(200)
                .json({
                    posts: posts,
                    message:
                        read_post_ids && read_post_ids.length > 0
                            ? 'Successfully viewed and fetched posts'
                            : 'Successfully fetched posts',
                })
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

    viewPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_id, student_id } = req.body;

            await mobilePostService.viewPost({
                postParentId: post_id,
                studentId: student_id,
                parentId: req.user.id,
            });

            return res
                .status(200)
                .json({ message: 'Successfully viewed' })
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

    viewExtended = async (req: ExtendedRequest, res: Response) => {
        try {
            const { post_ids, student_id } = req.body;

            await mobilePostService.viewExtended({
                postParentIds: post_ids,
                studentId: student_id,
                parentId: req.user.id,
            });

            return res
                .status(200)
                .json({ message: 'Successfully viewed' })
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

export default MobilePostModuleController;
