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
    invalid_cohort_format: 'invalid_cohort_format',
    cohort_must_be_positive: 'cohort_must_be_positive',
    invalid_or_missing_email: 'invalid_or_missing_email',
    invalid_or_missing_phone: 'invalid_or_missing_phone',
    invalid_or_missing_given_name: 'invalid_or_missing_given_name',
    invalid_or_missing_family_name: 'invalid_or_missing_family_name',
    invalid_or_missing_student_number: 'invalid_or_missing_student_number',
    invalid_or_missing_student_id: 'invalid_or_missing_student_id',
    invalid_or_missing_group_id: 'invalid_or_missing_group_id',
    invalid_or_missing_group_name: 'invalid_or_missing_group_name',
    invalid_or_missing_parents: 'invalid_or_missing_parents',
    invalid_student_id: 'invalid_student_id',
    invalid_sub_group_id: 'invalid_sub_group_id',
    invalid_id_list: 'invalid_id_list',
    // Post/message specific validation
    invalid_title: 'invalid_title',
    invalid_description: 'invalid_description',
    invalid_priority: 'invalid_priority',
    invalid_group_names: 'invalid_group_names',
    invalid_group_name: 'invalid_group_name',
    invalid_student_numbers_field: 'invalid_student_numbers',
    // Kintone specific validation
    invalid_kintone_domain_provided: 'invalid_kintone_domain_provided',
    invalid_kintone_subdomain_provided: 'invalid_kintone_subdomain_provided',
    invalid_kintone_token_provided: 'invalid_kintone_token_provided',

    // Database errors
    email_already_exists: 'email_already_exists',
    phone_already_exists: 'phone_already_exists',
    phone_number_already_exists: 'phone_number_already_exists',
    admin_already_exists: 'admin_already_exists',
    admin_does_not_exist: 'admin_does_not_exist',
    parent_does_not_exist: 'parent_does_not_exist',
    student_does_not_exist: 'student_does_not_exist',
    student_already_exists: 'student_already_exists',
    student_email_already_exists: 'student_email_already_exists',
    student_number_already_exists: 'student_number_already_exists',
    student_not_found: 'student_not_found',
    group_name_already_exists: 'group_name_already_exists',
    group_does_not_exist: 'group_does_not_exist',
    group_not_found: 'group_not_found',
    parent_group_not_found: 'parent_group_not_found',
    sub_group_not_found: 'sub_group_not_found',
    parent_student_limit_exceeded: 'parent_student_limit_exceeded',
    maximum_5_parents_allowed: 'maximum_5_parents_allowed',
    cannot_reference_self_as_sub_group: 'cannot_reference_self_as_sub_group',

    // General errors
    server_error: 'server_error',
    csv_is_empty_but_valid: 'csv_is_empty_but_valid',
    csv_processed_successfully: 'csv_processed_successfully',
    csv_processed_with_errors: 'csv_processed_with_errors',
    // Kintone errors
    kintone_request_timeout: 'kintone_request_timeout',
    kintone_network_error: 'kintone_network_error',
    // Success messages
    student_deleted: 'student_deleted',
    group_deleted: 'group_deleted',
    group_changed_successfully: 'group_changed_successfully',
    parents_changed_successfully: 'parents_changed_successfully',
    kintone_data_uploaded_successfully: 'kintone_data_uploaded_successfully',
} as const;

// Helper function to create simple error responses with translation keys
export function createErrorResponse(errorKey: string, details?: any) {
    return {
        success: false,
        error: errorKey,
        details,
    };
}
