import process from 'node:process';

import { mobilePostRepository } from './post.repository';

export class MobilePostService {
    async getPostData(params: { postParentId: string; parentId: number }) {
        return await mobilePostRepository.findPostParentData(params);
    }

    async getPost(params: {
        postId: string;
        parentId: number;
        studentId: number;
    }) {
        return await mobilePostRepository.findPostByPostId(params);
    }

    async listPosts(params: {
        parentId: number;
        studentId: number;
        lastPostId: number;
        lastSentAt: string;
        readPostIds?: number[];
    }) {
        if (params.readPostIds && params.readPostIds.length > 0) {
            const viewedPosts =
                await mobilePostRepository.listUnreadPostParentIds({
                    parentId: params.parentId,
                    studentId: params.studentId,
                    postIds: params.readPostIds,
                });

            if (viewedPosts.length > 0) {
                await mobilePostRepository.markViewedByIds(
                    viewedPosts.map((p: any) => p.id)
                );
            }
        }

        const perPage = parseInt(process.env.PER_PAGE + '') || 10;

        return await mobilePostRepository.listPosts({
            parentId: params.parentId,
            studentId: params.studentId,
            lastPostId: params.lastPostId,
            lastSentAt: params.lastSentAt,
            limit: perPage,
        });
    }

    async viewPost(params: {
        parentId: number;
        studentId: number;
        postParentId: number;
    }) {
        const post = await mobilePostRepository.findPostParentForView({
            postParentId: params.postParentId,
            studentId: params.studentId,
            parentId: params.parentId,
        });

        if (post.length === 0) {
            throw {
                status: 404,
                message: 'Post not Found',
            };
        }

        if (post[0].viewed_at) {
            throw {
                status: 403,
                message: 'Post already viewed',
            };
        }

        await mobilePostRepository.markViewedById(params.postParentId);
    }

    async viewExtended(params: {
        parentId: number;
        studentId: number;
        postParentIds: number[];
    }) {
        const posts = await mobilePostRepository.listUnreadPostParentIds({
            parentId: params.parentId,
            studentId: params.studentId,
            postIds: params.postParentIds,
        });

        if (posts.length === 0) {
            throw {
                status: 404,
                message: 'Post not Found',
            };
        }

        await mobilePostRepository.markViewedByIds(posts.map((p: any) => p.id));
    }

    async markPostViewedByPostId(postId: string): Promise<void> {
        await mobilePostRepository.markViewedForPostId(postId);
    }
}

export const mobilePostService = new MobilePostService();
