import { config } from "dotenv";

config();

export const ENVIRONMENT = {
    // Runtime Environment
    IS_LOCAL: !process.env.AWS_LAMBDA_FUNCTION_NAME,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',

    // AWS Services
    PINPOINT_APP_ID: process.env.PINPOINT_APP_ID!,
    SMS_ORIGINATION_IDENTITY: process.env.SMS_ORIGINATION_IDENTITY,
    SMS_CONFIGURATION_SET_NAME: process.env.SMS_CONFIGURATION_SET_NAME,
    KMS_KEY_ID: process.env.KMS_KEY_ID!,
    KMS_KEY_ARN: process.env.KMS_KEY_ARN,

    // Cognito Configuration
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID!,

    // AWS Credentials (for local development)
    LOCAL_AWS_ACCESS_KEY_ID: process.env.LOCAL_AWS_ACCESS_KEY_ID,
    LOCAL_AWS_SECRET_ACCESS_KEY: process.env.LOCAL_AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

    // PlayMobile API
    BROKER_URL: process.env.BROKER_URL,
    BROKER_AUTH: process.env.BROKER_AUTH,

    // Telegram Bot
    BOT_TOKEN: process.env.BOT_TOKEN!,

    // Database
    DB_HOST: process.env.HOST,
    DB_PORT: parseInt(process.env.DB_PORT ?? '3306'),
    DB_USER: process.env.USER,
    DB_PASSWORD: process.env.PASSWORD,
    DB_NAME: process.env.DATABASE,
} as const;

export const getEnvironmentInfo = () => ({
    runtime: ENVIRONMENT.IS_LOCAL ? 'LOCAL' : 'LAMBDA',
    region: ENVIRONMENT.AWS_REGION,
    hasPlayMobileConfig: !!(ENVIRONMENT.BROKER_URL && ENVIRONMENT.BROKER_AUTH),
    hasTelegramConfig: !!ENVIRONMENT.BOT_TOKEN,
    hasLocalAwsCredentials: !!(ENVIRONMENT.LOCAL_AWS_ACCESS_KEY_ID && ENVIRONMENT.LOCAL_AWS_SECRET_ACCESS_KEY),
    hasCognitoConfig: !!ENVIRONMENT.COGNITO_USER_POOL_ID,
});