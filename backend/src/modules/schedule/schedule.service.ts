import { ScheduleRepository } from './schedule.repository';
import {
    CreateScheduledPostRequest,
    CreateScheduledPostResponse,
    ScheduledPostListRequest,
    ScheduledPostListResponse,
    ViewScheduledPostResponse,
    UpdateScheduledPostRequest,
    UpdateScheduledPostResponse,
    DeleteScheduledPostResponse,
    ScheduledPostReceiversResponse,
    UpdateScheduledPostReceiversRequest,
    UpdateScheduledPostReceiversResponse,
    DeleteMultipleScheduledPostsRequest,
    DeleteMultipleScheduledPostsResponse,
} from './schedule.dto';
import { Images3Client } from '../../utils/s3-client';
import {
    isValidString,
    isValidPriority,
    isValidArrayId,
    isValidStringArrayId,
} from '../../utils/validate';
import { generatePaginationLinks, randomImageName } from '../../utils/helper';
import { DateTime } from 'luxon';
import DB from '../../utils/db-client';
import { config } from '../../config';

export class ScheduleService {
    constructor(private repository: ScheduleRepository) {}

    private isSafeUploadedImageName(imageName: string): boolean {
        if (!imageName || typeof imageName !== 'string') return false;
        if (imageName.length > 100) return false;
        if (imageName.includes('/') || imageName.includes('\\')) return false;

        return /^[a-f0-9]{64}\.(?:jpg|png|gif|webp|svg)$/i.test(imageName);
    }

    private extractSafeFilenameFromUrl(value: string): string | null {
        if (!value || typeof value !== 'string') return null;
        if (!/^https?:\/\//i.test(value)) return null;

        try {
            const parsed = new URL(value);
            const last = parsed.pathname.split('/').filter(Boolean).pop();
            if (!last) return null;
            return this.isSafeUploadedImageName(last) ? last : null;
        } catch {
            return null;
        }
    }

    async createScheduledPost(
        request: CreateScheduledPostRequest,
        adminId: number,
        schoolId: number
    ): Promise<CreateScheduledPostResponse> {
        const {
            title,
            description,
            priority,
            students,
            groups,
            image,
            scheduled_at,
        } = request;

        const utc = DateTime.fromISO(scheduled_at).toUTC();
        const formattedUTC = utc.toFormat('yyyy-MM-dd HH:mm:ss');

        if (!title || !isValidString(title)) {
            throw { status: 400, message: 'invalid_or_missing_title' };
        }
        if (!description || !isValidString(description)) {
            throw { status: 400, message: 'invalid_or_missing_description' };
        }
        if (!priority || !isValidPriority(priority)) {
            throw { status: 400, message: 'invalid_or_missing_priority' };
        }

        let imageName: string | undefined;
        if (image && typeof image === 'string') {
            const trimmed = image.trim();

            if (trimmed.startsWith('data:')) {
                const matches = trimmed.match(
                    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/
                );
                if (!matches || matches.length !== 3) {
                    throw { status: 400, message: 'invalid_image_format' };
                }

                const mimeType = matches[1].toLowerCase();
                const base64Data = matches[2].replace(/\s+/g, '');
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.length > 1024 * 1024 * 10) {
                    throw { status: 400, message: 'image_size_too_large' };
                }

                const extensionMap: Record<string, string> = {
                    'image/jpeg': '.jpg',
                    'image/jpg': '.jpg',
                    'image/png': '.png',
                    'image/gif': '.gif',
                    'image/webp': '.webp',
                    'image/svg+xml': '.svg',
                };

                const extension = extensionMap[mimeType];
                if (!extension) {
                    throw { status: 400, message: 'invalid_image_format' };
                }

                imageName = randomImageName() + extension;
                const imagePath = 'images/' + imageName;
                await Images3Client.uploadFile(buffer, mimeType, imagePath);
            } else if (trimmed.length > 0) {
                // Accept filename or full URL containing a safe filename (e.g. from /post/image upload)
                const extracted = this.extractSafeFilenameFromUrl(trimmed);
                if (extracted) {
                    imageName = extracted;
                } else {
                    if (!this.isSafeUploadedImageName(trimmed)) {
                        throw { status: 400, message: 'invalid_image_format' };
                    }
                    imageName = trimmed;
                }
            }
        }

        const scheduledPostId = await this.repository.create({
            title,
            description,
            priority,
            admin_id: adminId,
            school_id: schoolId,
            image: imageName,
            scheduled_at: formattedUTC,
        });

        await this.repository.insertReceivers(
            scheduledPostId,
            students,
            groups
        );

        return {
            post: {
                title,
                description,
                priority,
                scheduled_at: formattedUTC,
            },
        };
    }

    async getScheduledPostList(
        request: ScheduledPostListRequest,
        schoolId: number
    ): Promise<ScheduledPostListResponse> {
        const page = request.page || 1;
        const limit = parseInt(config.PER_PAGE + '') || 10;
        const offset = (page - 1) * limit;

        const postList = await this.repository.findWithPagination({
            school_id: schoolId,
            limit,
            offset,
            priority: request.priority,
            text: request.text,
        });

        const totalPosts = await this.repository.count({
            school_id: schoolId,
            priority: request.priority,
            text: request.text,
        });

        const totalPages = Math.ceil(totalPosts / limit);

        if (page > totalPages && totalPages !== 0) {
            throw { status: 400, message: 'invalid_page' };
        }

        const pagination = {
            current_page: page,
            per_page: limit,
            total_pages: totalPages,
            total_posts: totalPosts,
            next_page: page < totalPages ? page + 1 : null,
            prev_page: page > 1 ? page - 1 : null,
            links: generatePaginationLinks(page, totalPages),
        };

        const formattedPostList = postList.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            priority: post.priority,
            scheduled_at: post.scheduled_at,
            sent_at: null,
            edited_at: post.edited_at,
            admin: {
                id: post.admin_id,
                given_name: post.admin_given_name,
                family_name: post.admin_family_name,
            },
        }));

        return {
            scheduledPosts: formattedPostList,
            pagination,
        };
    }

    async getScheduledPost(
        id: number,
        schoolId: number
    ): Promise<ViewScheduledPostResponse> {
        const post = await this.repository.findById(id, schoolId);

        if (!post) {
            throw { status: 404, message: 'post_not_found' };
        }

        const utcDate = DateTime.fromJSDate(post.scheduled_at).toISO();

        return {
            post: {
                id: post.id,
                title: post.title,
                description: post.description,
                image: post.image,
                priority: post.priority,
                scheduled_at: utcDate!,
                sent_at: post.created_at,
                edited_at: post.edited_at ? post.edited_at : post.created_at,
            },
            admin: {
                id: (post as any).admin_id,
                given_name: (post as any).given_name,
                family_name: (post as any).family_name,
            },
        };
    }

    async deleteScheduledPost(
        id: number,
        schoolId: number
    ): Promise<DeleteScheduledPostResponse> {
        const post = await this.repository.findById(id, schoolId);

        if (!post) {
            throw { status: 404, message: 'Scheduled Post not found' };
        }

        if (post.image) {
            await Images3Client.deleteFile('images/' + post.image);
        }

        await this.repository.deleteById(id);

        return { message: 'scheduledPostDeleted' };
    }

    async updateScheduledPost(
        id: number,
        schoolId: number,
        request: UpdateScheduledPostRequest
    ): Promise<UpdateScheduledPostResponse> {
        const { title, description, priority, scheduled_at, image } = request;

        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localTime = DateTime.fromISO(scheduled_at, {
            zone: 'utc',
        }).setZone(userTimezone);
        const formattedUTC = localTime.toFormat('yyyy-MM-dd HH:mm:ss');

        if (!title || !isValidString(title)) {
            throw { status: 400, message: 'invalid_or_missing_title' };
        }
        if (!description || !isValidString(description)) {
            throw { status: 400, message: 'invalid_or_missing_description' };
        }
        if (!priority || !isValidPriority(priority)) {
            throw { status: 400, message: 'invalid_or_missing_priority' };
        }

        const post = await this.repository.findById(id, schoolId);

        if (!post) {
            throw { status: 404, message: 'post_not_found' };
        }

        let newImage = post.image;

        if (image !== undefined) {
            if (image === null) {
                newImage = null;
            } else if (typeof image === 'string') {
                const trimmed = image.trim();

                if (trimmed === '') {
                    newImage = null;
                } else if (trimmed === post.image) {
                    // no-op
                } else if (post.image && trimmed.includes(post.image)) {
                    // e.g. full URL that contains existing filename
                    // no-op
                } else if (this.isSafeUploadedImageName(trimmed)) {
                    newImage = trimmed;
                } else {
                    const extracted = this.extractSafeFilenameFromUrl(trimmed);
                    if (extracted) {
                        newImage = extracted;
                    } else if (trimmed.startsWith('data:')) {
                        const matches = trimmed.match(
                            /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/
                        );

                        if (!matches || matches.length !== 3) {
                            throw {
                                status: 400,
                                message: 'invalid_image_format',
                            };
                        }

                        const mimeType = matches[1].toLowerCase();
                        const base64Data = matches[2].replace(/\s+/g, '');
                        const buffer = Buffer.from(base64Data, 'base64');

                        if (buffer.length > 10 * 1024 * 1024) {
                            throw {
                                status: 400,
                                message: 'image_size_too_large',
                            };
                        }

                        const extensionMap: Record<string, string> = {
                            'image/jpeg': '.jpg',
                            'image/jpg': '.jpg',
                            'image/png': '.png',
                            'image/gif': '.gif',
                            'image/webp': '.webp',
                            'image/svg+xml': '.svg',
                        };

                        const extension = extensionMap[mimeType];
                        if (!extension) {
                            throw {
                                status: 400,
                                message: 'invalid_image_format',
                            };
                        }

                        const imageName = randomImageName() + extension;
                        const imagePath = `images/${imageName}`;
                        await Images3Client.uploadFile(
                            buffer,
                            mimeType,
                            imagePath
                        );

                        newImage = imageName;
                    } else {
                        throw { status: 400, message: 'invalid_image_format' };
                    }
                }
            } else {
                throw { status: 400, message: 'invalid_image_format' };
            }
        }

        await this.repository.update(id, schoolId, {
            title,
            description,
            priority,
            scheduled_at: formattedUTC,
            image: newImage,
        });

        return { message: 'Scheduled Post edited successfully' };
    }

    async getScheduledPostReceivers(
        id: number,
        schoolId: number
    ): Promise<ScheduledPostReceiversResponse> {
        const post = await this.repository.findById(id, schoolId);

        if (!post) {
            throw { status: 404, message: 'post_not_found' };
        }

        const receivers = await this.repository.findReceivers(id);

        const groupIds = receivers
            .filter(r => r.group_id)
            .map(r => r.group_id!);
        const studentIds = receivers
            .filter(r => r.student_id)
            .map(r => r.student_id!);

        const groups = await this.repository.findGroupsByIds(
            groupIds,
            schoolId
        );
        const students = await this.repository.findStudentsByIds(
            studentIds,
            schoolId
        );

        return { groups, students };
    }

    async updateScheduledPostReceivers(
        id: number,
        schoolId: number,
        request: UpdateScheduledPostReceiversRequest
    ): Promise<UpdateScheduledPostReceiversResponse> {
        const post = await this.repository.findById(id, schoolId);

        if (!post) {
            throw { status: 404, message: 'post_not_found' };
        }

        const { students = [], groups = [] } = request;

        await this.repository.deleteReceivers(id);

        if (students.length === 0 && groups.length === 0) {
            return {
                message:
                    'Receivers cleared successfully, nothing new to insert.',
            };
        }

        await this.repository.insertReceivers(id, students, groups);

        return { message: 'Receivers updated successfully' };
    }

    async deleteMultipleScheduledPosts(
        request: DeleteMultipleScheduledPostsRequest,
        schoolId: number
    ): Promise<DeleteMultipleScheduledPostsResponse> {
        const { ids } = request;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw { status: 401, message: 'invalid_or_missing_post_ids' };
        }

        const posts = await this.repository.findByIds(ids, schoolId);

        if (posts.length === 0) {
            throw { status: 404, message: 'No scheduled posts found' };
        }

        for (const post of posts) {
            if (post.image) {
                await Images3Client.deleteFile('images/' + post.image);
            }
        }

        await this.repository.deleteByIds(ids, schoolId);

        return {
            message: 'scheduledPostsDeleted',
            deletedCount: posts.length,
        };
    }

    async createPlannedMessages(): Promise<void> {
        const scheduledPostList = await this.repository.findAllScheduled();

        if (scheduledPostList.length <= 0) {
            return console.log('no scheduled post found');
        }

        for (const post of scheduledPostList) {
            const {
                title,
                description,
                priority,
                image,
                scheduled_at,
                admin_id,
                school_id,
            } = post;

            const scheduledAtISO = DateTime.fromJSDate(scheduled_at).toISO();
            const now = new Date().toISOString();

            if (!scheduledAtISO) {
                console.error('scheduled_at is missing');
                continue;
            }

            if (now < scheduledAtISO) {
                continue;
            }

            const scheduledPostId = post.id;

            const postInsert = await DB.execute(
                image
                    ? `INSERT INTO Post (title, description, priority, admin_id, image, school_id)
                       VALUE (:title, :description, :priority, :admin_id, :image, :school_id)`
                    : `INSERT INTO Post (title, description, priority, admin_id, school_id)
                       VALUE (:title, :description, :priority, :admin_id, :school_id)`,
                {
                    title,
                    description,
                    priority,
                    admin_id,
                    image,
                    school_id,
                }
            );

            const postId = postInsert.insertId;

            const { groups, students } =
                await this.repository.findReceiversByScheduledPostId(
                    scheduledPostId
                );

            if (
                students &&
                Array.isArray(students) &&
                isValidStringArrayId(students.map(String)) &&
                students.length > 0
            ) {
                const studentList = await DB.query(
                    `SELECT st.id FROM Student AS st WHERE st.id IN (:students)`,
                    { students }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id) VALUE (:post_id, :student_id)`,
                            {
                                post_id: postId,
                                student_id: student.id,
                            }
                        );

                        const studentAttachList = await DB.query(
                            `SELECT sp.parent_id FROM StudentParent AS sp WHERE sp.student_id = :student_id`,
                            { student_id: student.id }
                        );

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList
                                .map(
                                    (student: any) =>
                                        `(${post_student.insertId}, ${student.parent_id})`
                                )
                                .join(', ');
                            await DB.execute(
                                `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentValues}`
                            );
                        }
                    }
                }
            }

            if (
                groups &&
                Array.isArray(groups) &&
                isValidArrayId(groups) &&
                groups.length > 0
            ) {
                const studentList = await DB.query(
                    `SELECT gm.student_id, gm.group_id
                     FROM GroupMember AS gm
                     RIGHT JOIN StudentGroup sg on gm.group_id = sg.id
                     WHERE group_id IN (:groups)
                       AND sg.school_id = :school_id`,
                    { groups, school_id }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(
                            `INSERT INTO PostStudent (post_id, student_id, group_id) VALUE (:post_id, :student_id, :group_id)`,
                            {
                                post_id: postId,
                                student_id: student.student_id,
                                group_id: student.group_id,
                            }
                        );

                        const studentAttachList = await DB.query(
                            `SELECT sp.parent_id FROM StudentParent AS sp WHERE sp.student_id = :student_id`,
                            { student_id: student.student_id }
                        );

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList
                                .map(
                                    (student: any) =>
                                        `(${post_student.insertId}, ${student.parent_id})`
                                )
                                .join(', ');
                            await DB.execute(
                                `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentValues}`
                            );
                        }
                    }
                }
            }

            await DB.execute(
                `DELETE FROM scheduledPost WHERE id = :scheduledPostId`,
                { scheduledPostId }
            );

            console.log('scheduled post posted successfully');
        }
    }
}
