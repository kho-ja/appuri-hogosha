export interface CognitoEvent {
    triggerSource: string;
    userPoolId?: string;
    request: {
        userAttributes: {
            phone_number: string;
            [key: string]: string;
        };
        codeParameter?: string;
        tempPassword?: string;
        usernameParameter?: string;
        linkParameter?: string;
        code?: string;
        type?: string;
    };
    response?: {
        smsMessage?: string;
        emailMessage?: string;
        emailSubject?: string;
    };
}

export interface ApiGatewayEvent {
    httpMethod: string;
    path: string;
    body: string;
    [key: string]: any;
}

export interface DirectInvokeEvent {
    action: string;
    payload: any;
}

export type EventSource = 'COGNITO' | 'API_GATEWAY' | 'DIRECT_INVOKE' | 'SCHEDULED' | 'UNKNOWN';

export interface NotificationPost {
    id: string;
    arn: string;
    title: string;
    description: string;
    family_name: string;
    given_name: string;
    chat_id: string;
    language: string;
    phone_number: string;
    priority: string;
    sms: boolean;
}