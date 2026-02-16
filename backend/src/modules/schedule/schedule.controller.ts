import express, { NextFunction, Response, Router } from 'express';
import { ScheduleService } from './schedule.service';
import { ExtendedRequest } from '../../middlewares/auth';
import { isValidId, isValidPriority } from '../../utils/validate';
import cron from 'node-cron';
import { ApiError } from '../../errors/ApiError';
import { config } from '../../config';

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
        if (config.NODE_ENV !== 'test') {
            cron.schedule('* * * * *', async () => {
                console.log(
                    'Checking for scheduled messages...',
                    `${new Date()}`
                );
                await this.service.createPlannedMessages();
            });
        }
    }

    schedulePost = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.service.createScheduledPost(
                req.body,
                req.user.id,
                req.user.school_id
            );
            return res.status(200).json(result);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    scheduledPostList = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
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
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    scheduledPostView = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(400, 'invalid_or_missing_post_id');
            }

            const result = await this.service.getScheduledPost(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    deleteScheduledPost = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(400, 'invalid_or_missing_post_id');
            }

            const result = await this.service.deleteScheduledPost(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    updateScheduledPost = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(400, 'invalid_or_missing_post_id');
            }

            const result = await this.service.updateScheduledPost(
                parseInt(postId),
                req.user.school_id,
                req.body
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    updateScheduledPostRecievers = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(400, 'invalid_or_missing_post_id');
            }

            const result = await this.service.updateScheduledPostReceivers(
                parseInt(postId),
                req.user.school_id,
                req.body
            );

            return res.status(200).json(result);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    scheduledPostRecievers = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw new ApiError(400, 'invalid_or_missing_post_id');
            }

            const result = await this.service.getScheduledPostReceivers(
                parseInt(postId),
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (err: any) {
            return next(err);
        }
    };

    deleteMultipleScheduledPosts = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const result = await this.service.deleteMultipleScheduledPosts(
                req.body,
                req.user.school_id
            );

            return res.status(200).json(result).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };
}
