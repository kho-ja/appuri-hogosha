// DTO: Data Transfer Objects for Form endpoints
// Request/Response types

export interface GetFormListRequest {
    schoolId: string;
    page: number;
    reason?: string;
    status?: string;
}

export interface FormData {
    id: number;
    reason: string;
    date: string;
    additional_message: string | null;
    sent_at: string;
    status: string;
    parent: {
        id: number;
        family_name: string;
        given_name: string;
    };
    student: {
        id: number;
        family_name: string;
        given_name: string;
    };
}

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_forms: number;
    next_page: number | null;
    prev_page: number | null;
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
}

export interface FormListResponse {
    forms: FormData[];
    pagination: PaginationData;
}

export interface GetFormCountRequest {
    schoolId: string;
}

export interface FormCountResponse {
    form_count: number;
}

export interface GetFormDetailRequest {
    formId: string;
    schoolId: string;
}

export interface FormDetailData {
    id: number;
    reason: string;
    date: string;
    additional_message: string | null;
    sent_at: string;
    status: string;
}

export interface FormDetailResponse {
    form: FormDetailData;
    student: {
        id: number;
        family_name: string;
        given_name: string;
        phone_number: string;
        student_number: string;
    };
    parent: {
        id: number;
        family_name: string;
        given_name: string;
        phone_number: string;
    };
}

export interface UpdateFormStatusRequest {
    formId: string;
    schoolId: string;
    status: string;
}

export interface UpdateFormStatusResponse {
    form: FormDetailData;
    student: {
        id: number;
        family_name: string;
        given_name: string;
        phone_number: string;
        student_number: string;
    };
    parent: {
        id: number;
        family_name: string;
        given_name: string;
        phone_number: string;
    };
}
