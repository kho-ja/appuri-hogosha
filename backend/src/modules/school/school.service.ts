/**
 * School Service
 *
 * Business logic layer for School operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { schoolRepository } from './school.repository';
import { ApiError } from '../../errors/ApiError';
import type {
    GetSmsPriorityResponse,
    UpdateSmsPriorityRequest,
    UpdateSmsPriorityResponse,
    UpdateSchoolNameRequest,
    UpdateSchoolNameResponse,
} from './types/school.dto';

export class SchoolService {
    /**
     * Get SMS priority settings
     */
    async getSmsPriority(schoolId: number): Promise<GetSmsPriorityResponse> {
        const schoolInfo = await schoolRepository.findById(schoolId);

        if (!schoolInfo) {
            throw new ApiError(404, 'school_not_found');
        }

        return {
            school: {
                id: schoolId,
                name: schoolInfo.name,
                contact_email: schoolInfo.contact_email,
                priority: {
                    high: !!schoolInfo.sms_high,
                    medium: !!schoolInfo.sms_medium,
                    low: !!schoolInfo.sms_low,
                },
            },
        };
    }

    /**
     * Update SMS priority settings
     */
    async updateSmsPriority(
        request: UpdateSmsPriorityRequest,
        schoolId: number
    ): Promise<UpdateSmsPriorityResponse> {
        const { high, medium, low, title } = request;

        // Update settings
        await schoolRepository.updateSmsPriority({
            high: high ? 1 : 0,
            medium: medium ? 1 : 0,
            low: low ? 1 : 0,
            name: title,
            id: schoolId,
        });

        return {
            message: 'SMS Priority updated successfully',
        };
    }

    /**
     * Update school name
     */
    async updateSchoolName(
        request: UpdateSchoolNameRequest,
        schoolId: number
    ): Promise<UpdateSchoolNameResponse> {
        const { name } = request;

        // Update name
        await schoolRepository.updateName({
            name,
            id: schoolId,
        });

        // Get updated school info
        const school = await schoolRepository.getBasicInfo(schoolId);

        if (!school) {
            throw new ApiError(404, 'school_not_found');
        }

        return {
            message: 'School Name updated successfully',
            school: {
                id: schoolId,
                name: school.name,
                contact_email: school.contact_email,
            },
        };
    }
}

export const schoolService = new SchoolService();
