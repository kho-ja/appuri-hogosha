import { EventSource } from '../types/events';

export const detectEventSource = (event: any): EventSource => {
    // Enhanced Cognito trigger detection
    if (event.triggerSource) {
        // All Cognito events have triggerSource
        console.log(`🔍 Detected Cognito trigger: ${event.triggerSource}`);
        return 'COGNITO';
    }

    // API Gateway
    if (event.httpMethod && event.path) {
        console.log(`🔍 Detected API Gateway: ${event.httpMethod} ${event.path}`);
        return 'API_GATEWAY';
    }

    // Direct Lambda invoke
    if (event.action) {
        console.log(`🔍 Detected Direct Invoke: ${event.action}`);
        return 'DIRECT_INVOKE';
    }

    // Scheduled task (EventBridge)
    if (event.source && event['detail-type']) {
        console.log(`🔍 Detected Scheduled task: ${event.source}`);
        return 'SCHEDULED';
    }

    // Additional Cognito patterns (backup detection)
    if (event.request && (event.userPoolId || event.userName || event.region)) {
        console.log(`🔍 Detected Cognito (backup detection)`);
        return 'COGNITO';
    }

    console.log(`🔍 Unknown event type - treating as default notification task`);
    return 'UNKNOWN';
};