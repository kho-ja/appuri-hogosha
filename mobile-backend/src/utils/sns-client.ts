import {
    SNSClient,
    CreatePlatformEndpointCommand,
    PublishCommand,
    CreatePlatformEndpointCommandInput,
    PublishCommandInput
} from '@aws-sdk/client-sns'
import process from "node:process";

class PushNotificationClient {
    private client: SNSClient
    private ARN: string;

    constructor(PlatformARN: string) {
        this.client = new SNSClient({
            region: process.env.SERVICE_REGION,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY ?? '',
                secretAccessKey: process.env.SECRET_ACCESS_KEY ?? ''
            }
        })

        this.ARN = PlatformARN;
    }

    async createEndpoint(token: string): Promise<createEndpointOutput> {
        const params: CreatePlatformEndpointCommandInput = {
            PlatformApplicationArn: this.ARN,
            Token: token
        }

        try {
            const command = new CreatePlatformEndpointCommand(params);
            const response = await this.client.send(command);

            if (response.EndpointArn === undefined) {
                throw {
                    name: 'NotFound'
                }
            }
            return {
                ARN: response.EndpointArn
            }
        } catch (e: any) {

            if (e.name === 'InvalidParameterException') {
                throw {
                    status: 401,
                    message: 'Invalid device token',
                } as createEndpointThrow
            } else if (e.name === 'NotFound') {
                throw {
                    status: 404,
                    message: 'Device Not Found',
                } as createEndpointThrow
            } else {
                throw {
                    status: 500,
                    message: 'Internal server error'
                } as createEndpointThrow
            }
        }
    }

}

interface createEndpointOutput {
    ARN: string
}

interface createEndpointThrow {
    status: 401 | 404 | 500;
    message: string;
}


const ParentsSNS = new PushNotificationClient(process.env.SNS_ARN ?? '');

export {ParentsSNS}