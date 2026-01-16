import {
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    PutObjectAclCommand,
    PutObjectAclCommandInput,
    PutObjectCommand,
    PutObjectCommandInput,
    S3Client,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

class MyS3Client {
    private client: S3Client;
    private bucketName: string;

    constructor(bucket: string) {
        const config: ConstructorParameters<typeof S3Client>[0] = {
            region: process.env.SERVICE_REGION ?? '',
        };
        if (
            process.env.BUCKET_ACCESS_KEY &&
            process.env.BUCKET_SECRET_ACCESS_KEY
        ) {
            config.credentials = {
                accessKeyId: process.env.BUCKET_ACCESS_KEY,
                secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
            };
        }
        this.client = new S3Client(config);
        this.bucketName = bucket;
    }

    private useLocalStorage(): boolean {
        return process.env.LOCAL_IMAGE_STORAGE === 'true';
    }

    private resolveLocalPath(key: string): string {
        const safeKey = key.replace(/^\/+/, '');
        return path.resolve(process.cwd(), safeKey);
    }

    private async saveLocal(buffer: any, key: string): Promise<boolean> {
        try {
            const filePath = this.resolveLocalPath(key);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, buffer);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private async deleteLocal(key: string): Promise<boolean> {
        try {
            const filePath = this.resolveLocalPath(key);
            await fs.unlink(filePath);
            return true;
        } catch (e: any) {
            if (e?.code === 'ENOENT') return true;
            console.error(e);
            return false;
        }
    }

    async uploadFile(buffer: any, mime: any, key: string): Promise<boolean> {
        if (this.useLocalStorage()) {
            return this.saveLocal(buffer, key);
        }
        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: mime,
        };
        // console.log(params);
        const command = new PutObjectCommand(params);
        try {
            await this.client.send(command);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async setPublicRead(key: string): Promise<boolean> {
        if (this.useLocalStorage()) {
            return true;
        }
        const params: PutObjectAclCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            ACL: 'public-read',
        };

        const command = new PutObjectAclCommand(params);

        try {
            await this.client.send(command);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async deleteFile(key: string): Promise<boolean> {
        if (this.useLocalStorage()) {
            return this.deleteLocal(key);
        }
        const params: DeleteObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
        };

        const command = new DeleteObjectCommand(params);

        try {
            await this.client.send(command);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}

const Images3Client = new MyS3Client(process.env.BUCKET_NAME ?? '');

export { Images3Client };
