import DB from '../../../utils/db-client';

export class MobileFormRepository {
    async listForms(params: {
        parentId: number;
        studentId: number;
        lastFormId: number;
        limit: number;
    }): Promise<any[]> {
        if (params.lastFormId === 0) {
            return await DB.query(
                `SELECT id,reason,additional_message,date,student_id FROM Form
                 WHERE student_id = :student_id AND parent_id = :parent_id
                 ORDER BY sent_at DESC
                 LIMIT :limit`,
                {
                    parent_id: params.parentId,
                    student_id: params.studentId,
                    limit: params.limit,
                }
            );
        }

        return await DB.query(
            `SELECT id,reason,additional_message,date,student_id FROM Form
             WHERE student_id = :student_id AND parent_id = :parent_id
             AND id < :last_form_id
             ORDER BY sent_at DESC
             LIMIT :limit`,
            {
                parent_id: params.parentId,
                student_id: params.studentId,
                last_form_id: params.lastFormId,
                limit: params.limit,
            }
        );
    }

    async verifyStudentRelation(params: {
        parentId: number;
        studentId: number;
    }): Promise<any[]> {
        return await DB.query(
            `SELECT id FROM StudentParent
             WHERE parent_id = :parent_id AND student_id = :student_id;`,
            {
                parent_id: params.parentId,
                student_id: params.studentId,
            }
        );
    }

    async createForm(params: {
        studentId: number;
        parentId: number;
        reason: string;
        date: string;
        additional_message: string;
        schoolId: string;
    }): Promise<void> {
        await DB.execute(
            `INSERT INTO Form(student_id, parent_id, reason, date, additional_message, sent_at, school_id)
             VALUE (:student_id, :parent_id, :reason, :date, :additional_message, NOW(), :school_id)`,
            {
                student_id: params.studentId,
                parent_id: params.parentId,
                reason: params.reason,
                date: params.date,
                additional_message: params.additional_message,
                school_id: params.schoolId,
            }
        );
    }
}

export const mobileFormRepository = new MobileFormRepository();
