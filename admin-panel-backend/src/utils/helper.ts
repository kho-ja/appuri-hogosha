import crypto from "crypto";

export function generatePaginationLinks(currentPage: number, totalPages: number) {
    // const links = [];
    //
    // if (totalPages <= 10) {
    //     for (let i = 1; i <= totalPages; i++) {
    //         links.push(i);
    //     }
    // } else {
    //     links.push(1);
    //     if (currentPage > 4) {
    //         links.push('...');
    //     }
    //
    //     const start = Math.max(2, currentPage - 2);
    //     const end = Math.min(totalPages - 1, currentPage + 2);
    //
    //     for (let i = start; i <= end; i++) {
    //         links.push(i);
    //     }
    //
    //     if (currentPage < totalPages - 3) {
    //         links.push('...');
    //     }
    //     links.push(totalPages);
    // }
    //
    // return links;
    const links = [];

    if (totalPages <= 1) {
        for (let i = 1; i <= totalPages; i++) {
            links.push(i);
        }
        return links;
    }

    links.push(1)

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
        links.push('...');
    }

    for (let i = start; i <= end; i++) {
        links.push(i);
    }


    if (end < totalPages - 1) {
        links.push('...');
    }

    links.push(totalPages);

    return links;
}

export const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export function parseKintoneRow(row: { value: string, type: string }) {
    switch (row.type) {
        case 'RECORD_NUMBER':
            return Number(row.value)
        case 'SINGLE_LINE_TEXT':
            return String(row.value)
        case 'DATE':
            return new Date(row.value)
        case 'NUMBER':
            return Number(row.value)
        case 'DROP_DOWN':
            return String(row.value)
        case 'MULTI_LINE_TEXT':
            return String(row.value)
        case 'CREATED_TIME':
            return new Date(row.value)
        case 'LINK':
            return String(row.value)
        default:
            return row.value
    }
}

