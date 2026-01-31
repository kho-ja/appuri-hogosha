/**
 * Group Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for Group endpoints
 */

// ==================== Common Types ====================

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_members: number;
    next_page: number | null;
    prev_page: number | null;
    links: Array<{ page: number; url: string }>;
}

export interface GroupBasicData {
    id: number;
    name: string;
}

export interface GroupDetailData {
    id: number;
    name: string;
    created_at: Date;
    sub_group_id: number | null;
    sub_group_name: string | null;
}

export interface StudentMemberData {
    id: number;
    email: string;
    phone_number: string;
    student_number: string;
    given_name: string;
    family_name: string;
    cohort: number | null;
}

export interface SubGroupData {
    id: number;
    name: string;
    created_at: Date;
    member_count: number;
}

// ==================== GET /list - Get Group List ====================

export interface GetGroupListRequest {
    page?: number;
    all?: boolean;
    name?: string;
}

export interface GetGroupListResponse {
    groups: GroupDetailData[];
    pagination: PaginationData;
}

// ==================== POST /ids - Get Groups By IDs ====================

export interface GetGroupsByIdsRequest {
    groupIds: number[];
}

export interface GetGroupsByIdsResponse {
    groupList: GroupBasicData[];
}

// ==================== GET /:id - Get Group Detail ====================

export interface GetGroupDetailRequest {
    id: string; // from params
    context?: string; // query param: 'view' for pagination
    page?: number;
    email?: string;
    student_number?: string;
}

export interface GetGroupDetailResponse {
    group: GroupDetailData;
    members: StudentMemberData[];
    pagination: PaginationData;
}

// ==================== POST /create - Create Group ====================

export interface CreateGroupRequest {
    name: string;
    sub_group_id?: number;
    students?: number[];
}

export interface CreateGroupResponse {
    group: {
        id: number;
        name: string;
        sub_group_id: number | null;
        members: StudentMemberData[];
    };
}

// ==================== PUT /:id - Update Group ====================

export interface UpdateGroupRequest {
    id: string; // from params
    name: string;
    sub_group_id?: number | null;
    students?: number[];
}

export interface UpdateGroupResponse {
    message: string;
}

// ==================== DELETE /:id - Delete Group ====================

export interface DeleteGroupRequest {
    id: string; // from params
}

export interface DeleteGroupResponse {
    message: string;
}

// ==================== GET /:id/sub-groups - Get Sub Groups ====================

export interface GetSubGroupsRequest {
    id: string; // from params
}

export interface GetSubGroupsResponse {
    sub_groups: SubGroupData[];
}
