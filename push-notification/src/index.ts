// Main entry point - orchestrates all services
import { ENVIRONMENT } from './config/environment';
import { DatabaseClient } from './services/database/client';
import { DatabaseQueries } from './services/database/queries';
import { AwsSmsService } from './services/aws/sms';
import { PinpointService } from './services/aws/pinpoint';
import { PlayMobileService } from './services/playmobile/api';
import { CognitoHandler } from './handlers/cognito/sms-handler';
import { ApiHandler } from './handlers/api/sms-api';
import { NotificationProcessor } from './handlers/notifications/push-notifications';
import { detectEventSource } from './utils/event-detection';
import { EventSource, CognitoEvent, ApiGatewayEvent, DirectInvokeEvent } from './types/events';

console.log(`🏃 Running in ${ENVIRONMENT.IS_LOCAL ? 'LOCAL' : 'LAMBDA'} environment`);

// Initialize services
const dbClient = new DatabaseClient();
const dbQueries = new DatabaseQueries(dbClient);
const awsSmsService = new AwsSmsService();
const pinpointService = new PinpointService();
const playMobileService = new PlayMobileService();

// Initialize handlers
const cognitoHandler = new CognitoHandler(playMobileService, awsSmsService);
const apiHandler = new ApiHandler(playMobileService, awsSmsService);
const notificationProcessor = new NotificationProcessor(
    dbQueries,
    pinpointService,
    playMobileService,
    awsSmsService
);

// Main Lambda handler with event routing
export const handler = async (event: any, context: any) => {
    console.log("🚀 Starting enhanced notification handler");
    console.log("📥 Event:", JSON.stringify(event, null, 2));

    const eventSource: EventSource = detectEventSource(event);
    console.log(`📍 Event source detected: ${eventSource}`);

    try {
        switch (eventSource) {
            case 'COGNITO':
                console.log('🔐 Processing Cognito SMS trigger');
                return await cognitoHandler.handleCognitoSms(event as CognitoEvent);

            case 'API_GATEWAY':
                console.log('🌐 Processing API Gateway request');
                return await apiHandler.handleApiRequest(event as ApiGatewayEvent);

            case 'DIRECT_INVOKE':
                console.log('🎯 Processing direct invoke');
                const { action, payload } = event as DirectInvokeEvent;
                return await apiHandler.handleDirectInvoke(action, payload);

            case 'SCHEDULED':
                console.log('⏰ Processing scheduled task');
                const result = await notificationProcessor.processNotifications();
                await dbClient.closeConnection();
                return {
                    statusCode: 200,
                    body: JSON.stringify(result)
                };

            default:
                console.log('📱 Processing as default notification task');
                const defaultResult = await notificationProcessor.processNotifications();
                await dbClient.closeConnection();
                return {
                    statusCode: 200,
                    body: JSON.stringify(defaultResult)
                };
        }

    } catch (error) {
        console.error("❌ Handler error:", error);

        // Return appropriate error response based on event type
        if (eventSource === 'COGNITO') {
            return event; // Return original event for Cognito
        } else if (eventSource === 'API_GATEWAY') {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Internal server error' })
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: "error",
                    error: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};

// For local development - run directly
if (ENVIRONMENT.IS_LOCAL) {
    console.log('🚀 Running locally...');
    handler({}, {}).then(result => {
        console.log('📊 Result:', result);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
}