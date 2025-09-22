import multer from 'multer';
import iconv from 'iconv-lite';
import { Readable } from 'node:stream';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { ErrorKeys, createErrorResponse } from './error-codes';

export interface CSVRowBase {
    [key: string]: any;
}

export interface RowError<T extends CSVRowBase> {
    row: T;
    errors: Record<string, string>; // field -> error key
}

export interface CSVUploadSummary {
    total: number;
    processed: number;
    errors: number;
    inserted: number;
    updated: number;
    deleted: number;
}

export interface CSVUploadResponseShape<T extends CSVRowBase> {
    success: boolean;
    message: string;
    summary: CSVUploadSummary;
    inserted: T[];
    updated: T[];
    deleted: T[];
    errors: RowError<T>[];
    csvFile?: Buffer;
}

export function createBaseResponse<
    T extends CSVRowBase,
>(): CSVUploadResponseShape<T> {
    return {
        success: false,
        message: '',
        summary: {
            total: 0,
            processed: 0,
            errors: 0,
            inserted: 0,
            updated: 0,
            deleted: 0,
        },
        inserted: [],
        updated: [],
        deleted: [],
        errors: [],
    };
}

const storage = multer.memoryStorage();
export const uploadSingle = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const lower = file.originalname.toLowerCase();
        if (lower.endsWith('.csv')) return cb(null, true);
        if (
            ['text/csv', 'application/csv', 'text/plain'].includes(
                file.mimetype
            )
        )
            return cb(null, true);
        return cb(new Error('Only CSV files are allowed'));
    },
}).single('file');

export const handleCSVUpload = (req: any, res: any, next: any) => {
    uploadSingle(req, res, (err: any) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res
                        .status(400)
                        .json(createErrorResponse(ErrorKeys.file_too_large));
                }
                return res
                    .status(400)
                    .json(
                        createErrorResponse(ErrorKeys.server_error, err.message)
                    );
            }
            if (err.message === 'Only CSV files are allowed') {
                return res
                    .status(400)
                    .json(createErrorResponse(ErrorKeys.invalid_file_type));
            }
            return res
                .status(500)
                .json(createErrorResponse(ErrorKeys.server_error));
        }
        next();
    });
};

export async function parseCSVBuffer(buffer: Buffer): Promise<any[]> {
    const decoded = await iconv.decode(buffer, 'UTF-8');
    const stream = Readable.from(decoded);
    const rows: any[] = [];
    await new Promise((resolve, reject) => {
        stream
            .pipe(csv())
            .on('headers', (headers: string[]) => {
                if (headers?.length && headers[0].charCodeAt(0) === 0xfeff) {
                    headers[0] = headers[0].slice(1);
                }
            })
            .on('data', (data: any) => {
                if (Object.values(data).some(v => String(v).trim() !== '')) {
                    rows.push(data);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });
    return rows;
}

export function buildErrorCSV<T extends CSVRowBase>(
    errors: RowError<T>[],
    columns?: string[]
): Buffer {
    const rows = errors.map(e => {
        const flat: any = { ...e.row };
        flat.errors = Object.entries(e.errors)
            .map(([k, v]) => `${k}:${v}`)
            .join('; ');
        return flat;
    });
    const csvContent = stringify(rows, {
        header: true,
        columns: columns || undefined,
    });
    return Buffer.from('\uFEFF' + csvContent, 'utf-8');
}

export function finalizeResponse<T extends CSVRowBase>(
    resp: CSVUploadResponseShape<T>,
    withCSV: boolean
): CSVUploadResponseShape<T> {
    resp.summary.total = resp.summary.processed + resp.summary.errors; // ensure total consistency
    if (resp.errors.length > 0) {
        resp.message = 'csv_processed_with_errors';
        if (withCSV && !resp.csvFile) {
            resp.csvFile = buildErrorCSV(resp.errors);
        }
    } else {
        resp.message = 'csv_processed_successfully';
        resp.success = true;
    }
    if (resp.errors.length === 0 && resp.summary.processed > 0)
        resp.success = true;
    return resp;
}

export function bumpSummary(
    resp: CSVUploadResponseShape<any>,
    field: 'inserted' | 'updated' | 'deleted'
) {
    resp.summary[field] = resp[field].length;
    resp.summary.processed =
        resp.summary.inserted + resp.summary.updated + resp.summary.deleted;
}
