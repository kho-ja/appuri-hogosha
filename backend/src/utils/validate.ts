export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhoneNumber(phone_number: string): boolean {
    const phoneRegex = /^\d+$/;
    return phone_number.length > 0 && phoneRegex.test(phone_number);
}

export function isValidString(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0;
}

export function isValidStudentNumber(student_number: string): boolean {
    return typeof student_number === 'string' && student_number.trim().length > 0
}

export function isValidId(id: string): boolean {
    return parseInt(id) > 0 && /^\d+$/.test(id);
}

export function isValidArrayId(ids: number[]): boolean {
    if (!Array.isArray(ids)) {
        return false;
    }
    return ids.every(id => Number.isInteger(id) && id > 0);
}

export function isValidStringArrayId(ids: string[]): boolean {
    if (!Array.isArray(ids)) {
        return false;
    }
    return ids.every(id => isValidId(id));
}

const priorityList = ["low", "medium", "high"]

export function isValidPriority(priority: string): boolean {
    return typeof priority === 'string' && priorityList.includes(priority)
}

export function isValidImage(mimetype: string): boolean {
    return mimetype.includes('image')
}

const permissionList = {}

export function isValidPermissions(permissions: any): boolean {
    return false
}

const formStatusList = ['accept', 'reject', 'wait']

export function isValidStatus(status: string): boolean {
    return typeof status === 'string' && formStatusList.includes(status)
}

const reasonList = [
    'other', 'absence', 'lateness', 'leaving early'
]
export function isValidReason(reason: string): boolean {
    return typeof reason === 'string' && reasonList.includes(reason)
}

export function isValidDate(dateTime: string): boolean {
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateTimeRegex.test(dateTime);
}
