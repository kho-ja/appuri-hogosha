import {
    CognitoIdentityProviderClient,
    InitiateAuthCommandInput,
    InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config();

class CognitoClient {
    private client: CognitoIdentityProviderClient;
    private pool_id: string;
    private client_id: string;

    constructor(pool_id: string, client_id: string) {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.SERVICE_REGION,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY ?? '',
                secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
            },
        });

        this.pool_id = pool_id;
        this.client_id = client_id;
    }

    async validateCredentials(
        email: string,
        password: string
    ): Promise<boolean> {
        const params: InitiateAuthCommandInput = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.client_id,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        };

        try {
            const command = new InitiateAuthCommand(params);
            await this.client.send(command);

            return true;
        } catch (error: any) {
            if (
                error.name === 'NotAuthorizedException' ||
                error.name === 'UserNotFoundException'
            ) {
                return false;
            }
            throw error;
        }
    }
}

const Parent = new CognitoClient(
    process.env.PARENT_POOL_ID ?? '',
    process.env.PARENT_CLIENT_ID ?? ''
);

export { Parent };
