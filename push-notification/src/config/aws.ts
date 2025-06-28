import { PinpointClientConfig } from '@aws-sdk/client-pinpoint';
import { ENVIRONMENT } from './environment';

export const getAwsConfig = (): PinpointClientConfig => {
    const config: PinpointClientConfig = {
        region: ENVIRONMENT.AWS_REGION
    };

    // For local development, you can optionally specify custom credentials
    if (ENVIRONMENT.IS_LOCAL && ENVIRONMENT.LOCAL_AWS_ACCESS_KEY_ID && ENVIRONMENT.LOCAL_AWS_SECRET_ACCESS_KEY) {
        console.log('🔑 Using custom local AWS credentials');
        config.credentials = {
            accessKeyId: ENVIRONMENT.LOCAL_AWS_ACCESS_KEY_ID,
            secretAccessKey: ENVIRONMENT.LOCAL_AWS_SECRET_ACCESS_KEY
        };
    } else if (ENVIRONMENT.IS_LOCAL && ENVIRONMENT.AWS_ACCESS_KEY_ID && ENVIRONMENT.AWS_SECRET_ACCESS_KEY) {
        console.log('🔑 Using standard AWS credentials');
        config.credentials = {
            accessKeyId: ENVIRONMENT.AWS_ACCESS_KEY_ID,
            secretAccessKey: ENVIRONMENT.AWS_SECRET_ACCESS_KEY
        };
    } else if (ENVIRONMENT.IS_LOCAL) {
        console.log('🔑 Using AWS CLI credentials or default credential chain');
    } else {
        console.log('🔑 Using Lambda execution role');
    }

    return config;
};