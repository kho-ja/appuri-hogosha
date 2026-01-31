/**
 * Post Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for Post endpoints
 */

// ==================== Common Types ====================

export interface PostBasicData {
    id: number;
    title: string;
    description: string;
    priority: string;
    sent_at: Date;
    edited_at: Date | null;
}

export interface PostDetailData extends PostBasicData {
    image: string | null;
    read_count: number;
    unread_count: number;
}

export interface AdminData {
    id: number;
    given_name: string;
    family_name: string;
}

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_posts: number;
    next_page: number | null;
    prev_page: number | null;
    links: string[];
}

// ==================== POST /create - Create Post ====================

export interface CreatePostRequest {
    title: string;
    description: string;
    priority: string;
    students?: number[];
    groups?: number[];
    image?: string; // base64
}

export interface CreatePostResponse {
    post: {
        id: number;
        title: string;
        description: string;
        priority: string;
    };
}

// ==================== GET /list - List Posts ====================

export interface ListPostsRequest {
    page?: number;
    title?: string;
    description?: string;
    priority?: string;
    sent_at_from?: string;
    sent_at_to?: string;
}

export interface PostListItem {
    id: number;
    title: string;
    description: string;
    priority: string;
    sent_at: Date;
    edited_at: Date | null;
    read_percent: number;
    admin: AdminData;
}

export interface ListPostsResponse {
    posts: PostListItem[];
    pagination: PaginationData;
}

// ==================== GET /:id - View Post ====================

export interface ViewPostRequest {
    id: string; // from params
}

export interface ViewPostResponse {
    post: PostDetailData;
    admin: AdminData;
}

// ==================== PUT /:id - Update Post ====================

export interface UpdatePostRequest {
    title: string;
    description: string;
    priority: string;
    image?: string | null; // base64 or null to remove
}

export interface UpdatePostResponse {
    message: string;
}

// ==================== DELETE /:id - Delete Post ====================

export interface DeletePostRequest {
    id: string; // from params
}

export interface DeletePostResponse {
    message: string;
}

// ==================== POST /delete-multiple - Delete Multiple Posts ====================

export interface DeleteMultiplePostsRequest {
    postIds: number[];
}

export interface DeleteMultiplePostsResponse {
    message: string;
    deletedCount: number;
}

// ==================== GET /:id/students - View Post Students ====================

export interface StudentPaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_students: number;
    next_page: number | null;
    prev_page: number | null;
    links: string[];
}

export interface ParentReadStatus {
    id: number;
    given_name: string;
    family_name: string;
    viewed_at: Date | false;
}

export interface StudentWithReadStatus {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    post_student_id: number;
    parents: ParentReadStatus[];
}

export interface ViewPostStudentsRequest {
    id: string; // post_id from params
    page?: number;
    email?: string;
    student_number?: string;
}

export interface ViewPostStudentsResponse {
    students: StudentWithReadStatus[];
    pagination: StudentPaginationData;
}

// ==================== GET /:id/student/:student_id - View Post Student Parents ====================

export interface ViewPostStudentParentsRequest {
    id: string; // post_id from params
    student_id: string; // from params
}

export interface ViewPostStudentParentsResponse {
    student: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        student_number: string;
    };
    parents: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        viewed_at: Date | null;
    }[];
}

// ==================== GET /:id/groups - View Post Groups ====================

export interface GroupPaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_groups: number;
    next_page: number | null;
    prev_page: number | null;
    links: string[];
}

export interface GroupWithReadStatus {
    id: number;
    name: string;
    viewed_count: number;
    not_viewed_count: number;
}

export interface ViewPostGroupsRequest {
    id: string; // post_id from params
    page?: number;
    name?: string;
}

export interface ViewPostGroupsResponse {
    groups: GroupWithReadStatus[];
    pagination: GroupPaginationData;
}

// ==================== GET /:id/group/:group_id - View Post Group Students ====================

export interface ViewPostGroupStudentsRequest {
    id: string; // post_id from params
    group_id: string; // from params
    page?: number;
    email?: string;
    student_number?: string;
}

export interface ViewPostGroupStudentsResponse {
    group: {
        id: number;
        name: string;
    };
    students: StudentWithReadStatus[];
    pagination: StudentPaginationData;
}

// ==================== GET /:id/group/:group_id/student/:student_id - View Group Student Parent ====================

export interface ViewGroupStudentParentRequest {
    id: string; // post_id from params
    group_id: string; // from params
    student_id: string; // from params
}

export interface ViewGroupStudentParentResponse {
    group: {
        id: number;
        name: string;
    };
    student: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        student_number: string;
    };
    parents: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        viewed_at: Date | null;
    }[];
}

// ==================== POST /:id/groups/:group_id - Group Retry Push ====================

export interface GroupRetryPushRequest {
    id: string; // post_id from params
    group_id: string; // from params
}

export interface GroupRetryPushResponse {
    message: string;
}

// ==================== POST /:id/students/:student_id - Student Retry Push ====================

export interface StudentRetryPushRequest {
    id: string; // post_id from params
    student_id: string; // from params
}

export interface StudentRetryPushResponse {
    message: string;
}

// ==================== POST /:id/parents/:parent_id - Parent Retry Push ====================

export interface ParentRetryPushRequest {
    id: string; // post_id from params
    parent_id: string; // from params
}

export interface ParentRetryPushResponse {
    message: string;
}

// ==================== PUT /:id/sender - Update Post Senders ====================

export interface UpdatePostSendersRequest {
    students: number[];
    groups: number[];
}

export interface UpdatePostSendersResponse {
    message: string;
}
