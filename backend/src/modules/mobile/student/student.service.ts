import { mobileStudentRepository } from './student.repository';

export class MobileStudentService {
    async listStudents(parentId: number) {
        return await mobileStudentRepository.listStudentsByParentId(parentId);
    }

    async listUnread(parentId: number) {
        return await mobileStudentRepository.listUnreadCountsByParentId(
            parentId
        );
    }
}

export const mobileStudentService = new MobileStudentService();
