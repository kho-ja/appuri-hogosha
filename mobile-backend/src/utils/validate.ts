export function isValidString(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0;
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

