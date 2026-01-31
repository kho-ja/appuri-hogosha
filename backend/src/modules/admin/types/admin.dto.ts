/**
 * Admin Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for Admin endpoints
 */

// ==================== Common Types ====================

export interface AdminBasicData {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface AdminDetailData extends AdminBasicData {
    created_at: Date;
}

export interface PaginationData {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_admins: number;
    next_page: number | null;
    prev_page: number | null;
    links: string[];
}

// ==================== POST /create - Create Admin ====================

export interface CreateAdminRequest {
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface CreateAdminResponse {
    admin: AdminBasicData;
}

// ==================== POST /list - List Admins ====================

export interface ListAdminsRequest {
    page?: number;
    email?: string;
    phone_number?: string;
    name?: string;
}

export interface ListAdminsResponse {
    admins: AdminBasicData[];
    pagination: PaginationData;
}

// ==================== GET /:id - View Admin (GET) ====================

export interface ViewAdminRequest {
    id: string; // from params
}

export interface ViewAdminResponse {
    admin: AdminDetailData;
}

// ==================== POST /get-details - View Admin (Secure POST) ====================

export interface ViewAdminSecureRequest {
    adminId: string;
}

export interface ViewAdminSecureResponse {
    admin: AdminDetailData;
}

// ==================== PUT /:id - Update Admin ====================

export interface UpdateAdminRequest {
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface UpdateAdminResponse {
    admin: AdminBasicData;
}

// ==================== DELETE /:id - Delete Admin ====================

export interface DeleteAdminRequest {
    id: string; // from params
}

export interface DeleteAdminResponse {
    message: string;
}
