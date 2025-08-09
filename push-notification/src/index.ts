// Main entry point - orchestrates all services
import { ENVIRONMENT } from './config/environment';
import { DatabaseClient } from './services/database/client';
import { DatabaseQueries } from './services/database/queries';
import { AwsSmsService } from './services/aws/sms';
import { UnifiedPushService } from './services/unified/push';
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
const unifiedPushService = new UnifiedPushService();
const playMobileService = new PlayMobileService();

// Initialize handlers
const cognitoHandler = new CognitoHandler(playMobileService, awsSmsService);
const apiHandler = new ApiHandler(playMobileService, awsSmsService);
const notificationProcessor = new NotificationProcessor(
    dbQueries,
    unifiedPushService,
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

                // Enhanced logging for mixed notifications
                console.log(`📊 Notification Summary:`);
                console.log(`   📋 Total processed: ${result.count}/${result.total}`);
                if (result.push_count !== undefined) {
                    console.log(`   📱 Push notifications: ${result.push_count}`);
                }
                if (result.sms_only_count !== undefined) {
                    console.log(`   📧 SMS-only notifications: ${result.sms_only_count}`);
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify(result)
                };

            default:
                console.log('📱 Processing as default notification task');
                const defaultResult = await notificationProcessor.processNotifications();
                await dbClient.closeConnection();

                console.log(`📊 Default Notification Summary:`);
                console.log(`   📋 Total processed: ${defaultResult.count}/${defaultResult.total}`);
                if (defaultResult.push_count !== undefined) {
                    console.log(`   📱 Push notifications: ${defaultResult.push_count}`);
                }
                if (defaultResult.sms_only_count !== undefined) {
                    console.log(`   📧 SMS-only notifications: ${defaultResult.sms_only_count}`);
                }

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
                    error: error instanceof Error ? error.message : String(error),
                    count: 0,
                    total: 0
                })
            };
        }
    } finally {
        // Ensure database connection is closed
        try {
            await dbClient.closeConnection();
        } catch (closeError) {
            console.warn("⚠️ Error closing database connection:", closeError);
        }
    }
};

// Export for testing
export {
    notificationProcessor,
    dbQueries,
    unifiedPushService,
    playMobileService,
    awsSmsService
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