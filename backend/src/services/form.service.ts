// Service: Business logic layer
// Coordinates repository calls, transforms data, applies business rules

import { formRepository, FormFilters } from '../repositories/form.repository';
import { config } from '../config';
import { generatePaginationLinks } from '../utils/helper';
import { ApiError } from '../errors/ApiError';
import {
    GetFormListRequest,
    FormListResponse,
    FormData,
    GetFormCountRequest,
    FormCountResponse,
    GetFormDetailRequest,
    FormDetailResponse,
    UpdateFormStatusRequest,
    UpdateFormStatusResponse,
} from '../types/dto/form.dto';

class FormService {
    /**
     * Get paginated list of forms with optional filters
     */
    async getFormList(params: GetFormListRequest): Promise<FormListResponse> {
        const limit = config.PER_PAGE;
        const offset = (params.page - 1) * limit;

        const filters: FormFilters = {};
        if (params.reason) {
            filters.reason = params.reason;
        }
        if (params.status) {
            filters.status = params.status;
        }

        // Repository calls
        const formRows = await formRepository.findBySchoolId(
            params.schoolId,
            limit,
            offset,
            filters
        );
        const totalForms = await formRepository.countBySchoolId(
            params.schoolId,
            filters
        );

        // Business logic: calculate pagination
        const totalPages = Math.ceil(totalForms / limit);

        const pagination = {
            current_page: params.page,
            per_page: limit,
            total_pages: totalPages,
            total_forms: totalForms,
            next_page: params.page < totalPages ? params.page + 1 : null,
            prev_page: params.page > 1 ? params.page - 1 : null,
            links: generatePaginationLinks(params.page, totalPages),
        };

        // Transform data
        const forms: FormData[] = formRows.map(row => ({
            id: row.id,
            reason: row.reason,
            date: row.date,
            additional_message: row.additional_message,
            sent_at: row.sent_at,
            status: row.status,
            parent: {
                id: row.parent_id,
                family_name: row.parent_family_name,
                given_name: row.parent_given_name,
            },
            student: {
                id: row.student_id,
                family_name: row.student_family_name,
                given_name: row.student_given_name,
            },
        }));

        return {
            forms,
            pagination,
        };
    }

    /**
     * Get count of waiting forms for school
     */
    async getFormCount(
        params: GetFormCountRequest
    ): Promise<FormCountResponse> {
        const count = await formRepository.countWaitingBySchoolId(
            params.schoolId
        );

        return {
            form_count: count,
        };
    }

    /**
     * Get single form details
     */
    async getFormDetail(
        params: GetFormDetailRequest
    ): Promise<FormDetailResponse> {
        const form = await formRepository.findById(
            params.formId,
            params.schoolId
        );

        if (!form) {
            throw ApiError.notFound('Form not found');
        }

        return {
            form: {
                id: form.id,
                reason: form.reason,
                date: form.date,
                additional_message: form.additional_message,
                sent_at: form.sent_at,
                status: form.status,
            },
            student: {
                id: form.student_id,
                family_name: form.student_family_name,
                given_name: form.student_given_name,
                phone_number: (form as any).student_phone_number,
                student_number: (form as any).student_number,
            },
            parent: {
                id: form.parent_id,
                family_name: form.parent_family_name,
                given_name: form.parent_given_name,
                phone_number: (form as any).parent_phone_number,
            },
        };
    }

    /**
     * Update form status
     */
    async updateFormStatus(
        params: UpdateFormStatusRequest
    ): Promise<UpdateFormStatusResponse> {
        // Verify form exists
        const form = await formRepository.findById(
            params.formId,
            params.schoolId
        );

        if (!form) {
            throw ApiError.notFound('Form not found');
        }

        // Update status
        await formRepository.updateStatus(params.formId, params.status);

        // Return updated form (with new status)
        return {
            form: {
                id: form.id,
                reason: form.reason,
                date: form.date,
                additional_message: form.additional_message,
                sent_at: form.sent_at,
                status: params.status, // New status
            },
            student: {
                id: form.student_id,
                family_name: form.student_family_name,
                given_name: form.student_given_name,
                phone_number: (form as any).student_phone_number,
                student_number: (form as any).student_number,
            },
            parent: {
                id: form.parent_id,
                family_name: form.parent_family_name,
                given_name: form.parent_given_name,
                phone_number: (form as any).parent_phone_number,
            },
        };
    }
}

export const formService = new FormService();
