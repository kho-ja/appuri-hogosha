import express, { Response, Router } from 'express';
import { ScheduleService } from './schedule.service';
import { ExtendedRequest } from '../../middlewares/auth';
import { isValidId, isValidPriority } from '../../utils/validate';
import cron from 'node-cron';
import process from 'node:process';

export class ScheduleController {
    public router: Router = express.Router();

    constructor(private service: ScheduleService) {
        this.initRoutes();
        this.initCronJob();
    }

    private initRoutes(): void {
        // Import verifyToken middleware locally
        const { verifyToken } = require('../../middlewares/auth');

        this.router.post('/', verifyToken, this.schedulePost);
        this.router.get('/list', verifyToken, this.scheduledPostList);
        this.router.get('/each/:id', verifyToken, this.scheduledPostView);
        this.router.get(
            '/:id/recievers',
            verifyToken,
            this.scheduledPostRecievers
        );
        this.router.delete('/:id', verifyToken, this.deleteScheduledPost);
        this.router.put('/:id', verifyToken, this.updateScheduledPost);
        this.router.put(
            '/:id/recievers',
            verifyToken,
            this.updateScheduledPostRecievers
        );
        this.router.post(
            '/delete-multiple',
            verifyToken,
            this.deleteMultipleScheduledPosts
        );
    }

    private initCronJob(): void {
        if (process.env.NODE_ENV !== 'test') {
            cron.schedule('* * * * *', async () => {
                console.log(
                    'Checking for scheduled messages...',
                    `${new Date()}`
                );
                await this.service.createPlannedMessages();
            });
        }
    }

    schedulePost = async (req: ExtendedRequest, res: Response) => {
        try {
            const result = await this.service.createScheduledPost(
                req.body,
                req.user.id,
                req.user.school_id
            );
            return res.status(200).json(result);
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    scheduledPostList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const priority = req.query.priority as string;
            const text = req.query.text as string;

            const result = await this.service.getScheduledPostList(
                {
                    page,
                    priority:
                        priority && isValidPriority(priority)
                            ? priority
                            : undefined,
                    text: text || undefined,
                },
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    scheduledPostView = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw { status: 401, message: 'invalid_or_missing_post_id' };
            }

            const result = await this.service.getScheduledPost(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    deleteScheduledPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw { status: 401, message: 'invalid_or_missing_post_id' };
            }

            const result = await this.service.deleteScheduledPost(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    updateScheduledPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw { status: 401, message: 'invalid_or_missing_post_id' };
            }

            const result = await this.service.updateScheduledPost(
                parseInt(postId),
                req.user.school_id,
                req.body
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    updateScheduledPostRecievers = async (
        req: ExtendedRequest,
        res: Response
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw { status: 401, message: 'invalid_or_missing_post_id' };
            }

            const result = await this.service.updateScheduledPostReceivers(
                parseInt(postId),
                req.user.school_id,
                req.body
            );

            return res.status(200).json(result);
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };

    scheduledPostRecievers = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw { status: 401, message: 'invalid_or_missing_post_id' };
            }

            const result = await this.service.getScheduledPostReceivers(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (err: any) {
            console.error('Error fetching scheduled post receivers:', err);
            return res
                .status(500)
                .json({ error: 'internal_server_error' })
                .end();
        }
    };

    deleteMultipleScheduledPosts = async (
        req: ExtendedRequest,
        res: Response
    ) => {
        try {
            const result = await this.service.deleteMultipleScheduledPosts(
                req.body,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({ error: e.message }).end();
            } else {
                return res
                    .status(500)
                    .json({ error: 'internal_server_error' })
                    .end();
            }
        }
    };
}
