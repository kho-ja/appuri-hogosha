/**
 * School Module - Data Transfer Objects (DTOs)
 *
 * Request/Response type definitions for School endpoints
 */

// ==================== Common Types ====================

export interface SmsPriorityData {
    high: boolean;
    medium: boolean;
    low: boolean;
}

export interface SchoolBasicData {
    id: number;
    name: string;
    contact_email: string;
}

export interface SchoolWithPriorityData extends SchoolBasicData {
    priority: SmsPriorityData;
}

// ==================== GET /sms - Get SMS Priority Settings ====================

export interface GetSmsPriorityRequest {
    // No request body - uses school_id from auth
}

export interface GetSmsPriorityResponse {
    school: SchoolWithPriorityData;
}

// ==================== POST /sms - Update SMS Priority Settings ====================

export interface UpdateSmsPriorityRequest {
    high: boolean;
    medium: boolean;
    low: boolean;
    title: string;
}

export interface UpdateSmsPriorityResponse {
    message: string;
}

// ==================== POST /name - Update School Name ====================

export interface UpdateSchoolNameRequest {
    name: string;
}

export interface UpdateSchoolNameResponse {
    message: string;
    school: SchoolBasicData;
}
