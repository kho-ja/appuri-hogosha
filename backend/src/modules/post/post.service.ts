/**
 * Post Service
 *
 * Business logic layer for Post operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { postRepository } from './post.repository';
import { ApiError } from '../../errors/ApiError';
import { generatePaginationLinks, randomImageName } from '../../utils/helper';
import { Images3Client } from '../../utils/s3-client';
import DB from '../../utils/db-client';
import type {
    CreatePostRequest,
    CreatePostResponse,
    ListPostsRequest,
    ListPostsResponse,
    ViewPostResponse,
    UpdatePostRequest,
    UpdatePostResponse,
    DeletePostResponse,
    DeleteMultiplePostsRequest,
    DeleteMultiplePostsResponse,
} from './types/post.dto';

// Helper: Get all descendant group IDs
async function getAllDescendantGroupIds(
    initialGroupIds: number[],
    schoolId: number
): Promise<number[]> {
    if (!initialGroupIds || initialGroupIds.length === 0) {
        return [];
    }

    const allGroupIds = new Set<number>(initialGroupIds);
    let currentIds = [...initialGroupIds];

    while (currentIds.length > 0) {
        const childGroups = (await DB.query(
            `SELECT id FROM StudentGroup WHERE sub_group_id IN (:parentIds) AND school_id = :school_id`,
            { parentIds: currentIds, school_id: schoolId }
        )) as any[];

        if (childGroups.length === 0) {
            break;
        }

        const newChildIds = childGroups
            .map((g: any) => parseInt(g.id))
            .filter((id: number) => !allGroupIds.has(id) && !isNaN(id));

        if (newChildIds.length === 0) {
            break;
        }

        newChildIds.forEach((id: number) => allGroupIds.add(id));
        currentIds = newChildIds;
    }

    return Array.from(allGroupIds);
}

export class PostService {
    /**
     * Create new post
     */
    async createPost(
        request: CreatePostRequest,
        adminId: number,
        schoolId: number
    ): Promise<CreatePostResponse> {
        const { title, description, priority, students, groups, image } =
            request;

        // Handle image upload
        let imageName: string | null = null;
        if (image) {
            const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new ApiError(401, 'invalid_image_format');
            }
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            if (buffer.length > 1024 * 1024 * 10) {
                throw new ApiError(401, 'image_size_too_large');
            }

            imageName = randomImageName() + mimeType.replace('image/', '.');
            const imagePath = 'images/' + imageName;
            await Images3Client.uploadFile(buffer, mimeType, imagePath);
        }

        // Create post
        const postId = await postRepository.create({
            title,
            description,
            priority,
            admin_id: adminId,
            school_id: schoolId,
            image: imageName,
        });

        // Link individual students
        if (students && Array.isArray(students) && students.length > 0) {
            const studentList = (await DB.query(
                `SELECT st.id FROM Student AS st WHERE st.id IN (:students)`,
                { students }
            )) as { id: number }[];

            if (studentList.length > 0) {
                for (const student of studentList) {
                    const postStudent = await DB.execute(
                        `INSERT INTO PostStudent (post_id, student_id) VALUES (:post_id, :student_id)`,
                        { post_id: postId, student_id: student.id }
                    );

                    const studentParents = (await DB.query(
                        `SELECT sp.parent_id FROM StudentParent AS sp WHERE sp.student_id = :student_id`,
                        { student_id: student.id }
                    )) as { parent_id: number }[];

                    if (studentParents.length > 0) {
                        const parentInsertData = studentParents.map(
                            (parent: { parent_id: number }) => [
                                postStudent.insertId,
                                parent.parent_id,
                            ]
                        );
                        const placeholders = parentInsertData
                            .map(() => '(?, ?)')
                            .join(', ');
                        const flatValues = parentInsertData.flat();
                        await DB.execute(
                            `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${placeholders}`,
                            flatValues
                        );
                    }
                }
            }
        }

        // Link groups (and descendants)
        const groupIds =
            groups && Array.isArray(groups)
                ? groups
                      .map((id: any) => parseInt(id, 10))
                      .filter((id: number) => !isNaN(id))
                : [];

        if (groupIds.length > 0) {
            const allGroupIds = await getAllDescendantGroupIds(
                groupIds,
                schoolId
            );

            if (allGroupIds.length > 0) {
                const studentList = (await DB.query(
                    `SELECT gm.student_id, gm.group_id FROM GroupMember AS gm WHERE gm.group_id IN (:groups)`,
                    { groups: allGroupIds }
                )) as { student_id: number; group_id: number }[];

                if (studentList.length > 0) {
                    const postStudentInsertData = studentList.map(student => [
                        postId,
                        student.student_id,
                        student.group_id,
                    ]);
                    const placeholders = postStudentInsertData
                        .map(() => '(?, ?, ?)')
                        .join(', ');
                    const flatValues = postStudentInsertData.flat();

                    await DB.query(
                        `INSERT INTO PostStudent (post_id, student_id, group_id) VALUES ${placeholders}`,
                        flatValues
                    );

                    const newPostStudents = (await DB.query(
                        `SELECT id, student_id FROM PostStudent WHERE post_id = :postId AND group_id IS NOT NULL`,
                        { postId }
                    )) as { id: number; student_id: number }[];

                    const studentIdsForParentQuery = newPostStudents.map(
                        ps => ps.student_id
                    );

                    if (studentIdsForParentQuery.length > 0) {
                        const allParents = (await DB.query(
                            `SELECT student_id, parent_id FROM StudentParent WHERE student_id IN (:studentIds)`,
                            { studentIds: studentIdsForParentQuery }
                        )) as { student_id: number; parent_id: number }[];

                        if (allParents.length > 0) {
                            const postStudentIdMap = new Map(
                                newPostStudents.map(ps => [
                                    ps.student_id,
                                    ps.id,
                                ])
                            );

                            const allParentInsertData = allParents
                                .map(parent => {
                                    const postStudentId = postStudentIdMap.get(
                                        parent.student_id
                                    );
                                    if (postStudentId) {
                                        return [
                                            postStudentId,
                                            parent.parent_id,
                                        ];
                                    }
                                    return null;
                                })
                                .filter(Boolean);

                            if (allParentInsertData.length > 0) {
                                const parentPlaceholders = allParentInsertData
                                    .map(() => '(?, ?)')
                                    .join(', ');
                                const flatParentValues =
                                    allParentInsertData.flat();

                                await DB.query(
                                    `INSERT INTO PostParent (post_student_id, parent_id) VALUES ${parentPlaceholders}`,
                                    flatParentValues
                                );
                            }
                        }
                    }
                }
            }
        }

        return {
            post: {
                id: postId,
                title,
                description,
                priority,
            },
        };
    }

    /**
     * Get post list with pagination and filters
     */
    async getPostList(
        request: ListPostsRequest,
        schoolId: number
    ): Promise<ListPostsResponse> {
        const page = request.page || 1;
        const limit = parseInt(process.env.PER_PAGE || '10');
        const offset = (page - 1) * limit;

        const filters = {
            title: request.title,
            description: request.description,
            priority: request.priority,
            sent_at_from: request.sent_at_from,
            sent_at_to: request.sent_at_to,
        };

        const posts = await postRepository.findWithPagination(
            schoolId,
            limit,
            offset,
            filters
        );
        const totalPosts = await postRepository.countWithFilters(
            schoolId,
            filters
        );
        const totalPages = Math.ceil(totalPosts / limit);

        if (page > totalPages && totalPages !== 0) {
            throw new ApiError(400, 'invalid_page');
        }

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            priority: post.priority,
            sent_at: post.sent_at,
            edited_at: post.edited_at,
            read_percent: post.read_percent,
            admin: {
                id: post.admin_id,
                given_name: post.admin_given_name,
                family_name: post.admin_family_name,
            },
        }));

        return {
            posts: formattedPosts,
            pagination: {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_posts: totalPosts,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            },
        };
    }

    /**
     * Get post detail by ID
     */
    async getPostDetail(
        postId: number,
        schoolId: number
    ): Promise<ViewPostResponse> {
        const post = await postRepository.findByIdWithStats(postId, schoolId);

        if (!post) {
            throw new ApiError(404, 'post_not_found');
        }

        return {
            post: {
                id: post.id,
                title: post.title,
                description: post.description,
                image: post.image,
                priority: post.priority,
                sent_at: post.sent_at,
                edited_at: post.edited_at,
                read_count: post.read_count,
                unread_count: post.unread_count,
            },
            admin: {
                id: post.admin_id,
                given_name: post.given_name,
                family_name: post.family_name,
            },
        };
    }

    /**
     * Update post
     */
    async updatePost(
        postId: number,
        request: UpdatePostRequest,
        schoolId: number
    ): Promise<UpdatePostResponse> {
        const { title, description, priority, image } = request;

        const post = await postRepository.findById(postId, schoolId);
        if (!post) {
            throw new ApiError(404, 'post_not_found');
        }

        let imageName = post.image;

        if (image !== undefined) {
            if (image === null) {
                imageName = null;
            } else {
                const trimmed = image.trim();

                // Frontend may send empty string when user doesn't select an image.
                // Treat it as "no change".
                if (trimmed === '') {
                    // no-op
                } else if (trimmed === post.image) {
                    // no-op
                } else if (post.image && trimmed.includes(post.image)) {
                    // e.g. full URL that contains existing filename
                    // no-op
                } else {
                    const matches = trimmed.match(
                        /^data:(image\/\w+);base64,(.+)$/
                    );
                    if (!matches || matches.length !== 3) {
                        throw new ApiError(
                            401,
                            'Invalid image format. Make sure it is Base64 encoded.'
                        );
                    }
                    const mimeType = matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length > 10 * 1024 * 1024) {
                        throw new ApiError(
                            401,
                            'Image size is too large (max 10MB)'
                        );
                    }

                    imageName =
                        randomImageName() + mimeType.replace('image/', '.');
                    const imagePath = `images/${imageName}`;
                    await Images3Client.uploadFile(buffer, mimeType, imagePath);
                }
            }
        }

        await postRepository.update({
            title,
            description,
            priority,
            image: imageName,
            id: postId,
            school_id: schoolId,
        });

        await postRepository.resetPushNotifications(postId);

        return {
            message: 'postUpdated',
        };
    }

    /**
     * Delete post
     */
    async deletePost(
        postId: number,
        schoolId: number
    ): Promise<DeletePostResponse> {
        const post = await postRepository.findById(postId, schoolId);

        if (!post) {
            throw new ApiError(404, 'Post not found');
        }

        if (post.image) {
            await Images3Client.deleteFile('images/' + post.image);
        }

        await postRepository.delete(postId);

        return {
            message: 'postDeleted',
        };
    }

    /**
     * Delete multiple posts
     */
    async deleteMultiplePosts(
        request: DeleteMultiplePostsRequest,
        schoolId: number
    ): Promise<DeleteMultiplePostsResponse> {
        const { postIds } = request;

        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            throw new ApiError(400, 'invalid_or_missing_post_ids');
        }

        const postsInfo = await postRepository.findByIdsForDeletion(
            postIds,
            schoolId
        );

        if (postsInfo.length === 0) {
            throw new ApiError(404, 'No posts found');
        }

        for (const post of postsInfo) {
            if (post.image) {
                await Images3Client.deleteFile('images/' + post.image);
            }
        }

        await postRepository.deleteMultiple(postIds, schoolId);

        return {
            message: 'postsDeleted',
            deletedCount: postsInfo.length,
        };
    }

    // ==================== View Operations ====================

    /**
     * Get students for a post with pagination
     */
    async getPostStudents(
        postId: number,
        page: number,
        filters: {
            email?: string;
            student_number?: string;
        }
    ) {
        const perPage = 10;

        // Verify post exists
        // Verify post exists
        const { students, total } = await postRepository.findStudentsForPost(
            postId,
            page,
            perPage,
            filters
        );

        // Get parents for each student
        const studentsWithParents = await Promise.all(
            students.map(async student => {
                const parents = await postRepository.findParentsForStudent(
                    student.post_student_id
                );

                return {
                    id: student.id,
                    email: student.email,
                    phone_number: student.phone_number,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number,
                    post_student_id: student.post_student_id,
                    parents: parents.map(parent => ({
                        id: parent.id,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                        viewed_at: parent.viewed_at || false,
                    })),
                };
            })
        );

        const totalPages = Math.ceil(total / perPage);
        const prevPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        return {
            students: studentsWithParents,
            pagination: {
                current_page: page,
                per_page: perPage,
                total_pages: totalPages,
                total_students: total,
                next_page: nextPage,
                prev_page: prevPage,
                links: generatePaginationLinks(page, totalPages),
            },
        };
    }

    /**
     * Get student parents for a post
     */
    async getPostStudentParents(postId: number, studentId: number) {
        const result = await postRepository.findStudentWithParentsByPostStudent(
            postId,
            studentId
        );

        if (!result) {
            throw new ApiError(404, 'Student not found in this post');
        }

        return {
            student: result.student,
            parents: result.parents,
        };
    }

    /**
     * Get groups for a post with pagination
     */
    async getPostGroups(
        postId: number,
        page: number,
        filters: { name?: string }
    ) {
        const perPage = 10;

        // Get groups with pagination
        const { groups, total } = await postRepository.findGroupsForPost(
            postId,
            page,
            perPage,
            filters
        );

        const totalPages = Math.ceil(total / perPage);
        const prevPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        return {
            groups,
            pagination: {
                current_page: page,
                per_page: perPage,
                total_pages: totalPages,
                total_groups: total,
                next_page: nextPage,
                prev_page: prevPage,
                links: generatePaginationLinks(page, totalPages),
            },
        };
    }

    /**
     * Get group students for a post
     */
    async getGroupStudents(
        postId: number,
        groupId: number,
        page: number,
        filters: { email?: string; student_number?: string }
    ) {
        const perPage = 10;

        // Verify group exists
        const group = await postRepository.findGroupById(groupId);
        if (!group) {
            throw new ApiError(404, 'Group not found');
        }

        // Get students with pagination
        const { students, total } = await postRepository.findGroupStudents(
            postId,
            groupId,
            page,
            perPage,
            filters
        );

        // Get parents for each student
        const studentsWithParents = await Promise.all(
            students.map(async student => {
                const parents = await postRepository.findParentsForStudent(
                    student.post_student_id
                );

                return {
                    id: student.id,
                    email: student.email,
                    phone_number: student.phone_number,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number,
                    post_student_id: student.post_student_id,
                    parents: parents.map(parent => ({
                        id: parent.id,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                        viewed_at: parent.viewed_at || false,
                    })),
                };
            })
        );

        const totalPages = Math.ceil(total / perPage);
        const prevPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;

        return {
            group,
            students: studentsWithParents,
            pagination: {
                current_page: page,
                per_page: perPage,
                total_pages: totalPages,
                total_students: total,
                next_page: nextPage,
                prev_page: prevPage,
                links: generatePaginationLinks(page, totalPages),
            },
        };
    }

    /**
     * Get group student parent for a post
     */
    async getGroupStudentParent(
        postId: number,
        groupId: number,
        studentId: number
    ) {
        const result = await postRepository.findGroupStudentWithParents(
            postId,
            groupId,
            studentId
        );

        if (!result) {
            throw new ApiError(404, 'Student not found in this group or post');
        }

        return result;
    }

    // ==================== Retry Push Operations ====================

    /**
     * Retry push notification for a group
     */
    async retryGroupPush(postId: number, groupId: number) {
        // Verify group exists
        const group = await postRepository.findGroupById(groupId);
        if (!group) {
            throw new ApiError(404, 'Group not found');
        }

        await postRepository.resetGroupPushNotifications(postId, groupId);

        return { message: 'Push notifications reset for group' };
    }

    /**
     * Retry push notification for a student
     */
    async retryStudentPush(postId: number, studentId: number) {
        await postRepository.resetStudentPushNotifications(postId, studentId);

        return { message: 'Push notifications reset for student' };
    }

    /**
     * Retry push notification for a parent
     */
    async retryParentPush(postId: number, parentId: number) {
        await postRepository.resetParentPushNotification(postId, parentId);

        return { message: 'Push notification reset for parent' };
    }

    // ==================== Update Senders ====================

    /**
     * Update post senders (students and groups)
     */
    async updatePostSenders(
        postId: number,
        schoolId: number,
        studentIds: number[],
        groupIds: number[]
    ) {
        // Verify post exists and belongs to school
        const post = await postRepository.findById(postId, schoolId);
        if (!post) {
            throw new ApiError(404, 'Post not found');
        }
        if (post.school_id !== schoolId) {
            throw new ApiError(403, 'Forbidden');
        }

        try {
            // Start transaction
            await DB.execute('START TRANSACTION');

            // Delete existing relationships
            await postRepository.deletePostStudents(postId);
            await postRepository.deletePostGroups(postId);

            // Get all student IDs from groups (including descendants)
            const allGroupStudentIds: Set<number> = new Set();
            for (const groupId of groupIds) {
                const descendantGroupIds = await getAllDescendantGroupIds(
                    [groupId],
                    schoolId
                );
                const allGroupIds = [groupId, ...descendantGroupIds];

                for (const gId of allGroupIds) {
                    const { students } = await postRepository.findGroupStudents(
                        postId,
                        gId,
                        1,
                        10000,
                        {}
                    );
                    students.forEach(s => allGroupStudentIds.add(s.id));
                }
            }

            // Combine individual students with group students
            const allStudentIds = [
                ...new Set([...studentIds, ...allGroupStudentIds]),
            ];

            // Insert new relationships
            await postRepository.insertPostStudents(postId, allStudentIds);
            await postRepository.insertPostGroups(postId, groupIds);

            // Get all parents for the students
            const parentIds =
                await postRepository.findParentsByStudents(allStudentIds);

            // Delete old parents and insert new ones
            await postRepository.deletePostParentsNotInStudents(
                postId,
                allStudentIds
            );
            await postRepository.insertPostParents(postId, parentIds);

            // Commit transaction
            await DB.execute('COMMIT');

            return { message: 'Post senders updated successfully' };
        } catch (error) {
            // Rollback on error
            await DB.execute('ROLLBACK');
            throw error;
        }
    }
}

export const postService = new PostService();
