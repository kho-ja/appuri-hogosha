import multer from 'multer';
import { createErrorResponse, ErrorKeys } from './error-codes';
import { isValidImage } from './validate';

const storage = multer.memoryStorage();
const uploadSingleImage = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (isValidImage(file.mimetype)) return cb(null, true);
        return cb(new Error('Only image files are allowed'));
    },
}).single('image');

export const handleImageUpload = (req: any, res: any, next: any) => {
    uploadSingleImage(req, res, (err: any) => {
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
            if (err.message === 'Only image files are allowed') {
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
