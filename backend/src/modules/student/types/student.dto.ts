/**
 * Student Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for Student endpoints
 */

// ==================== Common Types ====================

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_students: number;
    next_page: number | null;
    prev_page: number | null;
    links: Array<{ page: number; url: string }>;
}

export interface StudentBasicData {
    id: number;
    given_name: string;
    family_name: string;
}

export interface StudentDetailData {
    id: number;
    email: string;
    given_name: string;
    family_name: string;
    phone_number: string;
    student_number: string;
    cohort: number | null;
}

export interface ParentBasicData {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface GroupBasicData {
    id: number;
    name: string;
}

// ==================== GET /ids - Get Students By IDs ====================

export interface GetStudentsByIdsRequest {
    studentIds: number[];
}

export interface GetStudentsByIdsResponse {
    studentList: StudentBasicData[];
}

// ==================== POST /list - Get Student List with Filters ====================

export interface GetStudentListRequest {
    page?: number;
    filterBy?:
        | 'all'
        | 'student_number'
        | 'cohort'
        | 'email'
        | 'phone_number'
        | 'given_name'
        | 'family_name';
    filterValue?: string;
}

export interface GetStudentListResponse {
    students: StudentDetailData[];
    pagination: PaginationData;
}

// ==================== GET /:id - Get Student Detail ====================

export interface GetStudentDetailRequest {
    id: string; // from params
}

export interface GetStudentDetailResponse {
    student: StudentDetailData;
    parents: ParentBasicData[];
    groups: GroupBasicData[];
}

// ==================== POST /create - Create Student ====================

export interface CreateStudentRequest {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort?: number;
    parents?: number[];
}

export interface CreateStudentResponse {
    student: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        student_number: string;
        parents: ParentBasicData[];
    };
}

// ==================== PUT /:id - Update Student ====================

export interface UpdateStudentRequest {
    id: string; // from params
    phone_number: string;
    given_name: string;
    family_name: string;
    student_number: string;
    cohort?: number;
}

export interface UpdateStudentResponse {
    student: {
        id: number;
        email: string;
        phone_number: string;
        given_name: string;
        family_name: string;
        student_number: string;
        cohort: number | null;
    };
}

// ==================== DELETE /:id - Delete Student ====================

export interface DeleteStudentRequest {
    id: string; // from params
}

export interface DeleteStudentResponse {
    message: string;
}

// ==================== GET /:id/parents - Get Student Parents ====================

export interface GetStudentParentsRequest {
    id: string; // from params
}

export interface GetStudentParentsResponse {
    student: StudentDetailData;
    parents: ParentBasicData[];
}

// ==================== POST /:id/parents - Change Student Parents ====================

export interface ChangeStudentParentsRequest {
    id: string; // from params
    parents: number[];
}

export interface ChangeStudentParentsResponse {
    message: string;
}
