/**
 * Admin Service
 *
 * Business logic layer for Admin operations
 * Coordinates repository calls, validates data, transforms responses
 */

import { adminRepository } from './admin.repository';
import { ApiError } from '../../errors/ApiError';
import { generatePaginationLinks } from '../../utils/helper';
import type {
    CreateAdminRequest,
    CreateAdminResponse,
    ListAdminsRequest,
    ListAdminsResponse,
    ViewAdminResponse,
    UpdateAdminRequest,
    UpdateAdminResponse,
    DeleteAdminResponse,
} from './types/admin.dto';

export class AdminService {
    constructor(private cognitoClient: any) {}

    async resendTemporaryPassword(
        adminId: number,
        schoolId: number
    ): Promise<{ message: string; admin_name: string; email: string }> {
        const admin = await adminRepository.findById(adminId, schoolId);

        if (!admin) {
            throw new ApiError(404, 'admin_not_found');
        }

        const result = await this.cognitoClient.resendTemporaryPassword(
            admin.email
        );

        return {
            message: result.message,
            admin_name: `${admin.given_name} ${admin.family_name}`,
            email: admin.email,
        };
    }

    /**
     * Create new admin
     */
    async createAdmin(
        request: CreateAdminRequest,
        schoolId: number
    ): Promise<CreateAdminResponse> {
        const { email, phone_number, given_name, family_name } = request;

        // Check for duplicates
        const duplicate = await adminRepository.findDuplicateByEmailOrPhone(
            email,
            phone_number
        );

        if (duplicate) {
            if (
                email === duplicate.email &&
                phone_number === duplicate.phone_number
            ) {
                throw new ApiError(401, 'email_and_phone_number_already_exist');
            }
            if (phone_number === duplicate.phone_number) {
                throw new ApiError(401, 'phone_number_already_exists');
            }
            throw new ApiError(401, 'email_already_exists');
        }

        // Register in Cognito
        const cognitoAdmin = await this.cognitoClient.register(email, email);

        // Create in database
        const adminId = await adminRepository.create({
            cognito_sub_id: cognitoAdmin.sub_id,
            email,
            phone_number,
            given_name,
            family_name,
            school_id: schoolId,
        });

        return {
            admin: {
                id: adminId,
                email,
                phone_number,
                given_name,
                family_name,
            },
        };
    }

    /**
     * Get admin list with pagination and filters
     */
    async getAdminList(
        request: ListAdminsRequest,
        schoolId: number
    ): Promise<ListAdminsResponse> {
        const page = request.page || 1;
        const limit = parseInt(process.env.PER_PAGE || '10');
        const offset = (page - 1) * limit;

        const filters = {
            email: request.email,
            phone_number: request.phone_number,
            name: request.name,
        };

        // Get admins with pagination
        const admins = await adminRepository.findWithPagination(
            schoolId,
            limit,
            offset,
            filters
        );

        // Get total count
        const totalAdmins = await adminRepository.countWithFilters(
            schoolId,
            filters
        );
        const totalPages = Math.ceil(totalAdmins / limit);

        return {
            admins,
            pagination: {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_admins: totalAdmins,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages),
            },
        };
    }

    /**
     * Get admin detail by ID
     */
    async getAdminDetail(
        adminId: number,
        schoolId: number
    ): Promise<ViewAdminResponse> {
        const admin = await adminRepository.findById(adminId, schoolId);

        if (!admin) {
            throw new ApiError(404, 'admin_not_found');
        }

        return { admin };
    }

    /**
     * Update admin
     */
    async updateAdmin(
        adminId: number,
        request: UpdateAdminRequest,
        schoolId: number
    ): Promise<UpdateAdminResponse> {
        const { phone_number, given_name, family_name } = request;

        // Check if admin exists
        const admin = await adminRepository.findById(adminId, schoolId);
        if (!admin) {
            throw new ApiError(404, 'admin_not_found');
        }

        // Check for duplicate phone number
        const duplicate = await adminRepository.findDuplicatePhoneExcludingId(
            phone_number,
            adminId
        );
        if (duplicate && duplicate.id !== adminId) {
            if (phone_number === duplicate.phone_number) {
                throw new ApiError(401, 'phone_number_already_exists');
            }
        }

        // Update admin
        await adminRepository.update({
            phone_number,
            given_name,
            family_name,
            id: adminId,
        });

        return {
            admin: {
                id: admin.id,
                email: admin.email,
                phone_number,
                given_name,
                family_name,
            },
        };
    }

    /**
     * Delete admin
     */
    async deleteAdmin(
        adminId: number,
        schoolId: number
    ): Promise<DeleteAdminResponse> {
        // Get admin info for deletion
        const admin = await adminRepository.getAdminInfoForDeletion(
            adminId,
            schoolId
        );

        if (!admin) {
            throw new ApiError(404, 'admin_not_found');
        }

        // Delete from Cognito first
        await this.cognitoClient.delete(admin.email);

        // Delete from database
        await adminRepository.delete(admin.id);

        return {
            message: 'adminDeleted',
        };
    }
}
