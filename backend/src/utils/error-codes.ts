// Simple error keys that correspond to frontend translation keys
export const ErrorKeys = {
    // File upload errors
    invalid_file_type: 'invalid_file_type',
    file_too_large: 'file_too_large',
    file_missing: 'file_missing',

    // Validation errors
    invalid_email: 'invalid_email',
    invalid_phone_number: 'invalid_phone_number',
    invalid_name: 'invalid_name',
    invalid_student_number: 'invalid_student_number',
    invalid_student_numbers: 'invalid_student_numbers',
    invalid_given_name: 'invalid_given_name',
    invalid_family_name: 'invalid_family_name',
    invalid_given_name_format: 'invalid_given_name_format',
    invalid_family_name_format: 'invalid_family_name_format',
    invalid_title: 'invalid_title',
    invalid_description: 'invalid_description',
    invalid_priority: 'invalid_priority',
    invalid_group_names: 'invalid_group_names',
    invalid_group_name: 'invalid_group_name',
    invalid_student_numbers_field: 'invalid_student_numbers',

    // Database errors
    email_already_exists: 'email_already_exists',
    phone_already_exists: 'phone_already_exists',
    admin_already_exists: 'admin_already_exists',
    admin_does_not_exist: 'admin_does_not_exist',
    parent_does_not_exist: 'parent_does_not_exist',
    student_does_not_exist: 'student_does_not_exist',
    student_already_exists: 'student_already_exists',
    student_email_already_exists: 'student_email_already_exists',
    student_number_already_exists: 'student_number_already_exists',
    group_name_already_exists: 'group_name_already_exists',
    group_does_not_exist: 'group_does_not_exist',
    parent_group_not_found: 'parent_group_not_found',
    parent_student_limit_exceeded: 'parent_student_limit_exceeded',

    // General errors
    server_error: 'server_error',
    csv_is_empty_but_valid: 'csv_is_empty_but_valid',
    csv_processed_successfully: 'csv_processed_successfully',
    csv_processed_with_errors: 'csv_processed_with_errors',
} as const;

// Helper function to create simple error responses with translation keys
export function createErrorResponse(errorKey: string, details?: any) {
    return {
        success: false,
        error: errorKey,
        details,
    };
}

export function isValidString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

export function isValidStudentNumber(value: any): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= 50;
}
