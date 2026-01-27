// Parent DTO: Request/Response types

export interface GetParentsByIdsRequest {
    parentIds: number[];
    schoolId: string;
}

export interface ParentBasicData {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface GetParentsByIdsResponse {
    parents: ParentBasicData[];
}

// List endpoints
export interface GetParentListRequest {
    schoolId: string;
    page: number;
    email?: string;
    phone_number?: string;
    name?: string;
    showOnlyNonLoggedIn?: boolean;
}

export interface ParentListData extends ParentBasicData {
    last_login_at: string | null;
    arn: string | null;
    students?: StudentBasicData[];
}

export interface StudentBasicData {
    id: number;
    given_name: string;
    family_name: string;
    student_number: string;
}

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_parents: number;
    next_page: number | null;
    prev_page: number | null;
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
}

export interface GetParentListResponse {
    parents: ParentListData[];
    pagination: PaginationData;
}

// View endpoints
export interface GetParentDetailRequest {
    parentId: string;
    schoolId: string;
}

export interface ParentDetailData extends ParentBasicData {
    created_at: string;
    last_login_at: string | null;
    arn: string | null;
}

export interface StudentDetailData {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
}

export interface GetParentDetailResponse {
    parent: ParentDetailData;
    students: StudentDetailData[];
}

// Detailed list endpoint
export interface GetDetailedParentListRequest {
    schoolId: string;
    page: number;
    email?: string;
    phone_number?: string;
    name?: string;
}

export interface DetailedParentData extends ParentBasicData {
    arn: string | null;
    students?: StudentBasicData[];
}

export interface GetDetailedParentListResponse {
    parents: DetailedParentData[];
    pagination: PaginationData;
}

// CRUD endpoints
export interface CreateParentRequest {
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    students?: number[];
    schoolId: string;
}

export interface CreateParentResponse {
    parent: {
        id: number;
        email: string | null;
        phone_number: string;
        given_name: string;
        family_name: string;
        students: StudentDetailData[];
    };
}

export interface UpdateParentRequest {
    parentId: string;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    schoolId: string;
}

export interface UpdateParentResponse {
    parent: ParentBasicData & { phone_number: string };
}

export interface DeleteParentRequest {
    parentId: string;
    schoolId: string;
}

export interface DeleteParentResponse {
    message: string;
}

// Cognito actions
export interface ResendPasswordRequest {
    parentId: string;
}

export interface ResendPasswordResponse {
    message: string;
    parent_name: string;
    email: string | null;
}

export interface BulkResendPasswordRequest {
    parentIds: number[];
}

export interface BulkResendPasswordResult {
    parent_id: number;
    success: boolean;
    message: string;
}

export interface BulkResendPasswordResponse {
    message: string;
    successful_count: number;
    failed_count: number;
    results: BulkResendPasswordResult[];
}

// Parent-Student relationship
export interface GetParentStudentsRequest {
    parentId: string;
    schoolId: string;
}

export interface ParentWithStudents {
    id: number;
    email: string | null;
    phone_number: string;
    given_name: string;
    family_name: string;
    created_at: string;
}

export interface StudentForParentData {
    id: number;
    given_name: string;
    family_name: string;
}

export interface GetParentStudentsResponse {
    parent: ParentWithStudents;
    students: StudentForParentData[];
}

export interface GetParentStudentsSecureRequest {
    parentId: string;
    schoolId: string;
}

export interface GetParentStudentsSecureResponse {
    students: StudentDetailData[];
}

export interface ChangeParentStudentsRequest {
    parentId: string;
    students: number[];
    schoolId: string;
}

export interface ChangeParentStudentsResponse {
    message: string;
    newStudentIds?: number[];
}
