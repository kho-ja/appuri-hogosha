// Create Scheduled Post
export interface CreateScheduledPostRequest {
    title: string;
    description: string;
    priority: string;
    students: number[];
    groups: number[];
    image?: string;
    scheduled_at: string;
}

export interface CreateScheduledPostResponse {
    post: {
        title: string;
        description: string;
        priority: string;
        scheduled_at: string;
    };
}

// List Scheduled Posts
export interface ScheduledPostListRequest {
    page?: number;
    priority?: string;
    text?: string;
}

export interface ScheduledPostData {
    id: number;
    title: string;
    description: string;
    priority: string;
    scheduled_at: Date;
    sent_at?: Date | null;
    edited_at?: Date | null;
    admin: {
        id: number;
        given_name: string;
        family_name: string;
    };
}

export interface ScheduledPostListResponse {
    scheduledPosts: ScheduledPostData[];
    pagination: {
        current_page: number;
        per_page: number;
        total_pages: number;
        total_posts: number;
        next_page: number | null;
        prev_page: number | null;
        links: any;
    };
}

// View Scheduled Post
export interface ViewScheduledPostResponse {
    post: {
        id: number;
        title: string;
        description: string;
        image: string | null;
        priority: string;
        scheduled_at: string;
        sent_at: Date;
        edited_at: Date;
    };
    admin: {
        id: number;
        given_name: string;
        family_name: string;
    };
}

// Update Scheduled Post
export interface UpdateScheduledPostRequest {
    title: string;
    description: string;
    priority: string;
    scheduled_at: string;
    image?: string | null;
}

export interface UpdateScheduledPostResponse {
    message: string;
}

// Delete Scheduled Post
export interface DeleteScheduledPostResponse {
    message: string;
}

// Get Scheduled Post Receivers
export interface ScheduledPostReceiversResponse {
    groups: Array<{
        id: number;
        name: string;
    }>;
    students: Array<{
        id: number;
        given_name: string;
        family_name: string;
        student_number: string;
        email: string;
        phone_number: string | null;
    }>;
}

// Update Scheduled Post Receivers
export interface UpdateScheduledPostReceiversRequest {
    students?: number[];
    groups?: number[];
}

export interface UpdateScheduledPostReceiversResponse {
    message: string;
}

// Delete Multiple Scheduled Posts
export interface DeleteMultipleScheduledPostsRequest {
    ids: number[];
}

export interface DeleteMultipleScheduledPostsResponse {
    message: string;
    deletedCount: number;
}

// Internal types
export interface ScheduledPostBasic {
    id: number;
    title: string;
    description: string;
    priority: string;
    scheduled_at: Date;
    created_at: Date;
    edited_at: Date | null;
    image: string | null;
    admin_id: number;
    school_id: number;
}

export interface ScheduledPostWithAdmin extends ScheduledPostBasic {
    admin_given_name: string;
    admin_family_name: string;
}

export interface ScheduledPostReceiver {
    group_id: number | null;
    student_id: number | null;
}

export interface GroupBasic {
    id: number;
    name: string;
}

export interface StudentBasic {
    id: number;
    given_name: string;
    family_name: string;
    student_number: string;
    email: string;
    phone_number: string | null;
}
