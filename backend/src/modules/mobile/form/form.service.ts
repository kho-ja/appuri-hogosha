import {
    isValidDate,
    isValidReason,
    isValidString,
} from '../../../utils/validate';
import { mobileFormRepository } from './form.repository';
import { config } from '../../../config';

export class MobileFormService {
    async listForms(params: {
        parentId: number;
        studentId: number;
        lastFormId: number;
    }): Promise<any[]> {
        const perPage = config.PER_PAGE;
        const forms = await mobileFormRepository.listForms({
            parentId: params.parentId,
            studentId: params.studentId,
            lastFormId: params.lastFormId,
            limit: perPage,
        });

        return forms.map((form: any) => {
            form.status = 'waiting';
            return form;
        });
    }

    async createForm(params: {
        parentId: number;
        schoolId: string;
        reason: string;
        date: string;
        studentId: number;
        additional_message?: string;
    }): Promise<void> {
        const { reason, date } = params;

        if (!reason || !isValidReason(reason)) {
            throw {
                status: 401,
                message: 'Invalid or missing reason',
            };
        }
        if (!date || !isValidDate(date)) {
            throw {
                status: 401,
                message: 'Invalid or date',
            };
        }

        const additional_information = params.additional_message
            ? String(params.additional_message)
            : '';

        if (
            params.additional_message &&
            !isValidString(additional_information)
        ) {
            throw {
                status: 401,
                message: 'Invalid or date',
            };
        }

        const studentRelation =
            await mobileFormRepository.verifyStudentRelation({
                parentId: params.parentId,
                studentId: params.studentId,
            });

        if (studentRelation.length <= 0) {
            throw {
                status: 401,
                message: 'Invalid student_id',
            };
        }

        await mobileFormRepository.createForm({
            studentId: params.studentId,
            parentId: params.parentId,
            reason: params.reason,
            date: params.date,
            additional_message: additional_information,
            schoolId: params.schoolId,
        });
    }
}

export const mobileFormService = new MobileFormService();
