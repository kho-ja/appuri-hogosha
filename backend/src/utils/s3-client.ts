import {
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    PutObjectAclCommand,
    PutObjectAclCommandInput,
    PutObjectCommand,
    PutObjectCommandInput,
    S3Client
} from '@aws-sdk/client-s3';

class MyS3Client {
    private client: S3Client;
    private bucketName: string;

    constructor(bucket: string) {
        this.client = new S3Client({
            region: process.env.SERVICE_REGION ?? '',
            credentials: {
                accessKeyId: process.env.BUCKET_ACCESS_KEY ?? '',
                secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY ?? '',
            },
        });
        this.bucketName = bucket;
    }

    async uploadFile(buffer: any, mime: any, key: string): Promise<boolean> {
        const params: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: mime,
        }
        // console.log(params);
        const command = new PutObjectCommand(params)
        try {
            await this.client.send(command);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async setPublicRead(key: string): Promise<boolean> {
        const params: PutObjectAclCommandInput = {
            Bucket: this.bucketName,
            Key: key,
            ACL: 'public-read',
        }

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
        const params: DeleteObjectCommandInput = {
            Bucket: this.bucketName,
            Key: key,
        }

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