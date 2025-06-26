import { PinpointClient, SendMessagesCommand, ChannelType, DirectMessageConfiguration, PinpointClientConfig } from '@aws-sdk/client-pinpoint';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { Telegraf, Markup } from "telegraf";
import { config } from "dotenv";
import DatabaseClient from "./db-client";

/*
🚀 SMS ROUTING STRATEGY:
📞 Ucell (91, 93, 94)    → AWS SMS (bypasses PlayMobile issues)
📞 Beeline (90, 99)      → PlayMobile API (local rates)  
📞 UMS (95)              → PlayMobile API (local rates)
📞 Mobiuz (97, 98)       → PlayMobile API (local rates)
🌍 International         → AWS SMS (global coverage)
*/

config();

// Check if running locally or in Lambda
const isLocal = !process.env.AWS_LAMBDA_FUNCTION_NAME;

console.log(`🏃 Running in ${isLocal ? 'LOCAL' : 'LAMBDA'} environment`);

// AWS Client configuration
const awsConfig: PinpointClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1'
};

// For local development, you can optionally specify custom credentials
if (isLocal && process.env.LOCAL_AWS_ACCESS_KEY_ID && process.env.LOCAL_AWS_SECRET_ACCESS_KEY) {
    console.log('🔑 Using custom local AWS credentials');
    awsConfig.credentials = {
        accessKeyId: process.env.LOCAL_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.LOCAL_AWS_SECRET_ACCESS_KEY
    };
} else if (isLocal) {
    console.log('🔑 Using AWS CLI credentials or default credential chain');
}

// Initialize AWS End User Messaging clients
const pinpointClient = new PinpointClient(awsConfig);
const smsClient = new PinpointSMSVoiceV2Client(awsConfig);

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN!);

// Get DB instance
const DB = new DatabaseClient();

// Types for different event sources
interface CognitoEvent {
    triggerSource: string;
    request: {
        userAttributes: {
            phone_number: string;
            [key: string]: string;
        };
    };
    response: {
        smsMessage: string;
    };
}

interface ApiGatewayEvent {
    httpMethod: string;
    path: string;
    body: string;
    [key: string]: any;
}

interface DirectInvokeEvent {
    action: string;
    payload: any;
}

// Enhanced cost protection and rate limiting
const SMS_RATE_LIMIT = {
    MAX_BATCH_SIZE: 50,           // Max messages per batch (to avoid error 105)
    BATCH_DELAY_MS: 1000,         // Delay between batches
    MAX_RETRIES: 2,               // Max retry attempts
    RETRY_DELAY_MS: 5000,         // Delay before retry
    DAILY_LIMIT: 1000,            // Daily SMS limit
    HOURLY_LIMIT: 100,            // Hourly SMS limit
    MESSAGE_TTL: 3600             // 1 hour TTL
};

// SMS counter for rate limiting (in-memory, use Redis in production)
const smsCounter = {
    daily: new Map<string, number>(),
    hourly: new Map<string, number>(),

    getDailyKey(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    },

    getHourlyKey(): string {
        const now = new Date();
        return `${now.toISOString().split('T')[0]}_${now.getHours()}`; // YYYY-MM-DD_HH
    },

    getDailyCount(): number {
        return this.daily.get(this.getDailyKey()) || 0;
    },

    getHourlyCount(): number {
        return this.hourly.get(this.getHourlyKey()) || 0;
    },

    increment(): void {
        const dailyKey = this.getDailyKey();
        const hourlyKey = this.getHourlyKey();

        this.daily.set(dailyKey, (this.daily.get(dailyKey) || 0) + 1);
        this.hourly.set(hourlyKey, (this.hourly.get(hourlyKey) || 0) + 1);
    },

    canSend(): boolean {
        return this.getDailyCount() < SMS_RATE_LIMIT.DAILY_LIMIT &&
            this.getHourlyCount() < SMS_RATE_LIMIT.HOURLY_LIMIT;
    },

    getRemainingQuota(): { daily: number; hourly: number } {
        return {
            daily: SMS_RATE_LIMIT.DAILY_LIMIT - this.getDailyCount(),
            hourly: SMS_RATE_LIMIT.HOURLY_LIMIT - this.getHourlyCount()
        };
    }
};

// SMS Status Monitoring and Diagnostics
const smsStatusTracker = {
    pendingMessages: new Map<string, { phone: string; timestamp: number; attempts: number }>(),

    trackMessage(messageId: string, phone: string): void {
        this.pendingMessages.set(messageId, {
            phone,
            timestamp: Date.now(),
            attempts: 1
        });
    },

    updateStatus(messageId: string, status: string, description?: string): void {
        const message = this.pendingMessages.get(messageId);
        if (message) {
            console.log(`📊 SMS Status Update: ${messageId} -> ${status}`);

            if (['Delivered', 'Failed', 'Rejected', 'Expired'].includes(status)) {
                // Final status - remove from tracking
                this.pendingMessages.delete(messageId);
            }
        }
    },

    async checkPendingMessages(): Promise<void> {
        const now = Date.now();
        const staleThreshold = 30 * 60 * 1000; // 30 minutes

        for (const [messageId, message] of this.pendingMessages) {
            if (now - message.timestamp > staleThreshold) {
                console.warn(`⚠️ SMS ${messageId} to ${message.phone} is stale (${Math.round((now - message.timestamp) / 60000)} minutes)`);
                console.warn(`💡 Possible reasons: recipient phone off, out of coverage, or network issues`);
            }
        }
    },

    getDiagnostics(): { pendingMessages: number; oldestPendingMinutes: number; rateLimitStatus: { daily: number; hourly: number } } {
        const pending = this.pendingMessages.size;
        const oldestTimestamp = Math.min(...Array.from(this.pendingMessages.values()).map(m => m.timestamp));
        const oldestAge = pending > 0 ? Math.round((Date.now() - oldestTimestamp) / 60000) : 0;

        return {
            pendingMessages: pending,
            oldestPendingMinutes: oldestAge,
            rateLimitStatus: smsCounter.getRemainingQuota()
        };
    }
};

// Enhanced SMS delivery diagnostics with routing information
const diagnoseSmsDeliveryIssue = (phone: string, status?: string): void => {
    console.log(`🔍 SMS Delivery Diagnosis for ${phone}:`);

    // Get routing information
    const routing = getUzbekistanOperatorRouting(phone);

    if (!routing.isUzbekistan) {
        console.log(`❌ Invalid phone format: ${phone} (should be 998xxxxxxxxx)`);
        return;
    }

    console.log(`📶 Operator: ${routing.operator}`);
    console.log(`🚀 Routing: ${routing.usePlayMobile ? 'PlayMobile API' : 'AWS SMS (Ucell bypass)'}`);

    // Status analysis
    if (status) {
        const statusMeanings: Record<string, string> = {
            'Transmitted': '📤 Sent to operator, waiting for delivery (normal - can take up to 24h)',
            'Delivered': '✅ Successfully delivered to recipient',
            'NotDelivered': '❌ Not delivered (recipient has no credit, phone blocked, etc.)',
            'Rejected': '🚫 Rejected (number in operator blacklist)',
            'Failed': '💥 Failed to send (wrong originator or API error)',
            'Expired': '⏰ Message expired (recipient offline for 24h+)'
        };

        const meaning = statusMeanings[status] || 'Unknown status';
        console.log(`📊 Status: ${status} - ${meaning}`);

        if (status === 'Transmitted') {
            console.log(`💡 "Transmitted" is normal - message sent to ${routing.operator}, awaiting delivery confirmation`);
            console.log(`⏱️  Wait up to 24 hours for final delivery status`);
        }
    }

    // Common issues and solutions
    console.log(`🔧 Troubleshooting tips:`);
    console.log(`   1. If "Transmitted": Wait 24h, recipient may be offline/out of coverage`);
    console.log(`   2. If "NotDelivered": Recipient may have insufficient balance or be blocked`);
    console.log(`   3. If "Rejected": Number may be in operator blacklist`);
    console.log(`   4. If "Failed": Check originator name and API credentials`);

    // Operator-specific troubleshooting
    if (routing.operator === 'Ucell') {
        console.log(`🔧 Ucell-specific info:`);
        console.log(`   📞 Ucell numbers (91, 93, 94) now route via AWS SMS`);
        console.log(`   🚀 This bypasses PlayMobile API issues with Ucell`);
        console.log(`   💰 Uses international AWS SMS rates instead of local rates`);
    } else if (routing.usePlayMobile) {
        console.log(`🔧 PlayMobile routing info:`);
        console.log(`   📞 ${routing.operator} numbers use PlayMobile API`);
        console.log(`   💰 Uses local Uzbekistan SMS rates`);
        console.log(`   🔗 Check PlayMobile account supports ${routing.operator} delivery`);
    }
};

// Credentials verification function  
const verifyPlayMobileCredentials = async (): Promise<{ valid: boolean, reason: string }> => {
    try {
        if (!process.env.BROKER_URL || !process.env.BROKER_AUTH) {
            return { valid: false, reason: 'Missing BROKER_URL or BROKER_AUTH environment variables' };
        }

        // Test with minimal request
        const headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Basic ' + Buffer.from(process.env.BROKER_AUTH).toString('base64')
        };

        const testBody = {
            "messages": [{
                "recipient": "998000000000",  // Test number (invalid but properly formatted)
                "message-id": "TEST_CREDS",
                "sms": {
                    "originator": "JDU",
                    "content": {
                        "text": "Test"
                    }
                }
            }]
        };

        console.log('🔐 Testing PlayMobile credentials...');
        console.log(`   🔗 URL: ${process.env.BROKER_URL}/broker-api/send`);
        console.log(`   🗝️  Auth: Basic ${Buffer.from(process.env.BROKER_AUTH).toString('base64').substring(0, 10)}...`);

        const response = await fetch(process.env.BROKER_URL + '/broker-api/send', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testBody),
        });

        const responseText = await response.text();
        console.log(`   📊 Response Status: ${response.status}`);
        console.log(`   📄 Response Body: ${responseText}`);

        if (response.status === 401) {
            return { valid: false, reason: 'Invalid credentials - check BROKER_AUTH' };
        } else if (response.status === 400) {
            // Parse error response to get more details
            try {
                const errorResponse = JSON.parse(responseText);
                const errorCode = errorResponse['error-code'] || errorResponse.error_code || 'unknown';
                const errorDescription = errorResponse['error-description'] || errorResponse.error_description || 'Unknown error';

                if (errorCode === '202') {
                    // Empty recipient is expected for test number - means credentials work
                    return { valid: true, reason: 'Credentials valid (got expected 202 for test number)' };
                } else {
                    return { valid: true, reason: `Credentials valid (got error ${errorCode} for test number: ${errorDescription})` };
                }
            } catch (e) {
                // Even if parsing fails, 400 usually means we're authenticated
                return { valid: true, reason: 'Credentials valid (got 400 for test number)' };
            }
        } else if (response.status === 200) {
            return { valid: true, reason: 'Credentials valid (got 200)' };
        } else {
            return { valid: false, reason: `Unexpected response: ${response.status} - ${responseText}` };
        }

    } catch (error) {
        return {
            valid: false,
            reason: `Connection error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

// Event source detection
const detectEventSource = (event: any): 'COGNITO' | 'API_GATEWAY' | 'DIRECT_INVOKE' | 'SCHEDULED' | 'UNKNOWN' => {
    // Cognito trigger
    if (event.triggerSource && event.request && event.response) {
        return 'COGNITO';
    }

    // API Gateway
    if (event.httpMethod && event.path) {
        return 'API_GATEWAY';
    }

    // Direct Lambda invoke
    if (event.action) {
        return 'DIRECT_INVOKE';
    }

    // Scheduled task (EventBridge)
    if (event.source && event['detail-type']) {
        return 'SCHEDULED';
    }

    return 'UNKNOWN';
};

// Uzbekistan number detection with operator-specific routing
const getUzbekistanOperatorRouting = (phoneNumber: string): { isUzbekistan: boolean; operator: string; usePlayMobile: boolean } => {
    if (!phoneNumber) return { isUzbekistan: false, operator: 'Unknown', usePlayMobile: false };

    // Remove + if present for checking
    const cleanNumber = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    // Check if it's Uzbekistan (12 digits starting with 998)
    if (cleanNumber.length !== 12 || !cleanNumber.startsWith('998')) {
        return { isUzbekistan: false, operator: 'Unknown', usePlayMobile: false };
    }

    // Operator detection
    const operatorCode = cleanNumber.substring(3, 5);
    const operators: Record<string, { name: string; usePlayMobile: boolean }> = {
        '90': { name: 'Beeline', usePlayMobile: true },    // Use PlayMobile for Beeline
        '91': { name: 'Ucell', usePlayMobile: false },     // Use AWS for Ucell (problems with PlayMobile)
        '93': { name: 'Ucell', usePlayMobile: false },     // Use AWS for Ucell (problems with PlayMobile)
        '94': { name: 'Ucell', usePlayMobile: false },     // Use AWS for Ucell (problems with PlayMobile)
        '95': { name: 'UMS', usePlayMobile: true },        // Use PlayMobile for UMS
        '97': { name: 'Mobiuz', usePlayMobile: true },     // Use PlayMobile for Mobiuz
        '98': { name: 'Mobiuz', usePlayMobile: true },     // Use PlayMobile for Mobiuz
        '99': { name: 'Beeline', usePlayMobile: true }     // Use PlayMobile for Beeline
    };

    const operatorInfo = operators[operatorCode];
    if (operatorInfo) {
        return {
            isUzbekistan: true,
            operator: operatorInfo.name,
            usePlayMobile: operatorInfo.usePlayMobile
        };
    }

    return { isUzbekistan: true, operator: 'Unknown', usePlayMobile: false };
};

// Keep the original function for backward compatibility
const isUzbekistanNumber = (phoneNumber: string): boolean => {
    const routing = getUzbekistanOperatorRouting(phoneNumber);
    return routing.isUzbekistan;
};

// PlayMobile priority mapping function
const mapPlayMobilePriority = (priority: 'low' | 'normal' | 'high' | 'realtime'): string => {
    // Based on PlayMobile API docs, individual messages use these exact strings
    const priorityMap: Record<string, string> = {
        'low': 'normal',        // Map low to normal as PlayMobile standard
        'normal': 'normal',
        'high': 'high',
        'realtime': 'realtime'
    };

    return priorityMap[priority] || 'normal';
};

// Enhanced PlayMobile SMS API with Ucell-specific formatting
const sendSmsViaLocalApiWithProtection = async (
    phoneNumber: string,
    message: string,
    postId?: string,
    priority: 'low' | 'normal' | 'high' | 'realtime' = 'normal'
): Promise<{ success: boolean, reason?: string, messageId?: string }> => {
    try {
        // 1. Check rate limits
        if (!smsCounter.canSend()) {
            const quota = smsCounter.getRemainingQuota();
            console.error(`❌ Rate limit exceeded. Remaining: Daily=${quota.daily}, Hourly=${quota.hourly}`);
            return {
                success: false,
                reason: `Rate limit exceeded. Daily: ${quota.daily}, Hourly: ${quota.hourly} remaining`
            };
        }

        // 2. Validate credentials
        if (!process.env.BROKER_URL || !process.env.BROKER_AUTH) {
            console.error('❌ PlayMobile SMS API credentials not configured');
            return { success: false, reason: 'API credentials not configured' };
        }

        // 3. Enhanced phone number validation and formatting for Uzbekistan operators
        let formattedPhone = phoneNumber;
        if (formattedPhone.startsWith('+998')) {
            formattedPhone = formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+')) {
            console.error(`❌ Invalid country code: ${phoneNumber}. Only Uzbekistan (+998) supported`);
            return { success: false, reason: 'Only Uzbekistan numbers supported' };
        }

        if (formattedPhone.length !== 12 || !formattedPhone.startsWith('998')) {
            console.error(`❌ Invalid phone format: ${phoneNumber}. Must be 998xxxxxxxxx`);
            return { success: false, reason: 'Invalid phone number format' };
        }

        // 4. Operator-specific formatting validation
        const operatorCode = formattedPhone.substring(3, 5);
        const operatorMap: Record<string, { name: string; prefixes: string[]; format: string }> = {
            'Ucell': {
                name: 'Ucell',
                prefixes: ['91', '93', '94'],
                format: '9989Yxxxxxxx (where Y=1,3,4)'
            },
            'Beeline': {
                name: 'Beeline',
                prefixes: ['90', '99'],
                format: '9989Yxxxxxxx (where Y=0,9)'
            },
            'UMS': {
                name: 'UMS',
                prefixes: ['95'],
                format: '99895xxxxxxx'
            },
            'Mobiuz': {
                name: 'Mobiuz',
                prefixes: ['97', '98'],
                format: '9989Yxxxxxxx (where Y=7,8)'
            }
        };

        let detectedOperator = 'Unknown';
        for (const [name, info] of Object.entries(operatorMap)) {
            if (info.prefixes.includes(operatorCode)) {
                detectedOperator = name;
                break;
            }
        }

        console.log(`📶 Detected operator: ${detectedOperator} (${operatorCode}) for ${formattedPhone}`);

        // 5. Special handling for Ucell numbers based on their documentation
        if (['91', '93', '94'].includes(operatorCode)) {
            console.log(`🔧 Applying Ucell-specific formatting for ${formattedPhone}`);

            // Ucell documentation shows they expect "9989Yxxxxxxx" format
            // Let's ensure our number matches this exactly
            if (!['91', '93', '94'].includes(formattedPhone.substring(3, 5))) {
                console.error(`❌ Invalid Ucell prefix: ${operatorCode}. Expected: 91, 93, or 94`);
                return { success: false, reason: `Invalid Ucell prefix: ${operatorCode}` };
            }
        }

        // 6. Generate unique message ID (max 40 chars as per API docs)
        const messageId = postId ? `JDUParent${postId}` : `JDUCognito${Date.now()}`;
        if (messageId.length > 40) {
            console.error(`❌ Message ID too long: ${messageId.length} chars`);
            return { success: false, reason: 'Message ID too long' };
        }

        // 7. Prepare headers
        const headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Basic ' + Buffer.from(process.env.BROKER_AUTH).toString('base64')
        };

        // 8. Enhanced message structure with correct PlayMobile format (no priority to avoid errors)
        const requestBody = {
            "timing": {
                "send-evenly": 1,                    // Distribute sending evenly
                "allowed-starttime": "08:00",        // Send only during business hours
                "allowed-endtime": "22:00"           // Avoid night sending
            },
            "messages": [{
                "recipient": formattedPhone,         // Ensure exact format from API docs
                "message-id": messageId,
                // Remove priority temporarily to test if this fixes the error
                "sms": {
                    "originator": "JDU",             // Keep originator simple for compatibility
                    "ttl": SMS_RATE_LIMIT.MESSAGE_TTL,   // 1 hour TTL
                    "content": {
                        "text": message
                    }
                }
            }]
        };

        console.log(`📤 Sending SMS via PlayMobile API:`);
        console.log(`   📞 To: ${formattedPhone} (${detectedOperator})`);
        console.log(`   🆔 Message ID: ${messageId}`);
        console.log(`   ⚡ Priority: ${priority}`);

        // 9. Enhanced retry logic with better error handling
        let lastError: string | undefined;
        for (let attempt = 1; attempt <= SMS_RATE_LIMIT.MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(process.env.BROKER_URL + '/broker-api/send', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                });

                // Enhanced response handling
                const responseText = await response.text();
                console.log(`📥 PlayMobile API Response (attempt ${attempt}):`);
                console.log(`   🔢 Status: ${response.status}`);
                console.log(`   📄 Body: ${responseText}`);

                if (response.status === 200) {
                    console.log(`✅ PlayMobile SMS sent successfully to ${detectedOperator} number`);

                    // Increment counter only on success
                    smsCounter.increment();

                    return { success: true, messageId, reason: responseText || 'Request received' };
                } else if (response.status === 400) {
                    // Enhanced error parsing for 400 responses
                    let errorResponse;
                    try {
                        errorResponse = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error(`❌ Failed to parse error response: ${responseText}`);
                        return {
                            success: false,
                            reason: `API returned 400 but response not parseable: ${responseText}`
                        };
                    }

                    // PlayMobile uses "error-code" (dash) not "error_code" (underscore)
                    const errorCode = String(errorResponse['error-code'] || errorResponse.error_code || 'unknown');
                    const errorDescription = errorResponse['error-description'] || errorResponse.error_description || 'No description provided';

                    console.error(`❌ PlayMobile API Error (${errorCode}): ${errorDescription}`);

                    // Handle specific errors with operator context
                    if (errorCode === '104') {
                        return { success: false, reason: 'Invalid priority - check priority values (use: normal, high, realtime)' };
                    } else if (errorCode === '105') {
                        return { success: false, reason: 'Too many message IDs - reduce batch size' };
                    } else if (errorCode === '102') {
                        return { success: false, reason: 'Account blocked - contact PlayMobile support immediately' };
                    } else if (errorCode === '202') {
                        return { success: false, reason: `Empty recipient - check ${detectedOperator} number format` };
                    } else if (errorCode === '205') {
                        return { success: false, reason: 'Empty message-id - system error' };
                    } else if (errorCode === '401') {
                        return { success: false, reason: 'Empty originator - check API configuration' };
                    } else if (errorCode === '404') {
                        return { success: false, reason: 'Empty content - message text missing' };
                    }

                    lastError = `API Error ${errorCode}: ${errorDescription}`;

                    // Don't retry on validation errors (including priority errors)
                    if (['104', '202', '205', '401', '404'].includes(errorCode)) {
                        break;
                    }
                } else {
                    lastError = `HTTP ${response.status}: ${responseText}`;
                    console.error(`❌ PlayMobile API returned status: ${response.status} (attempt ${attempt})`);
                    console.error(`   📄 Response: ${responseText}`);
                }
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                console.error(`❌ PlayMobile SMS API error (attempt ${attempt}):`, error);
            }

            // Wait before retry
            if (attempt < SMS_RATE_LIMIT.MAX_RETRIES) {
                console.log(`⏳ Retrying in ${SMS_RATE_LIMIT.RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, SMS_RATE_LIMIT.RETRY_DELAY_MS));
            }
        }

        return { success: false, reason: lastError || 'Unknown error after retries' };

    } catch (error) {
        console.error('❌ PlayMobile SMS API error:', error);
        return { success: false, reason: error instanceof Error ? error.message : String(error) };
    }
};

// Updated wrapper function for backward compatibility
const sendSmsViaLocalApi = async (phoneNumber: string, message: string, postId?: string): Promise<boolean> => {
    const result = await sendSmsViaLocalApiWithProtection(phoneNumber, message, postId);
    return result.success;
};

// Cognito SMS handler with operator-specific routing
const handleCognitoSms = async (event: CognitoEvent): Promise<CognitoEvent> => {
    try {
        const triggerSource = event.triggerSource;

        // Only process SMS-related triggers
        if (!triggerSource.includes('SMS')) {
            return event;
        }

        const phoneNumber = event.request.userAttributes.phone_number || '';
        const message = event.response.smsMessage;

        console.log(`📱 Processing Cognito SMS for ${phoneNumber}`);

        // Get operator routing information
        const routing = getUzbekistanOperatorRouting(phoneNumber);

        if (routing.isUzbekistan) {
            console.log(`🇺🇿 Uzbekistan number detected: ${phoneNumber} (${routing.operator})`);

            if (routing.usePlayMobile) {
                console.log(`📤 Routing ${routing.operator} via PlayMobile API`);

                const success = await sendSmsViaLocalApi(phoneNumber, message);

                if (success) {
                    // Suppress Cognito SMS by setting message to empty
                    event.response.smsMessage = '';
                    console.log('✅ SMS sent successfully via PlayMobile API, suppressing Cognito SMS');
                } else {
                    console.warn('⚠️ PlayMobile API failed, falling back to Cognito SMS');
                }
            } else {
                console.log(`📤 ${routing.operator} numbers use AWS SMS (bypassing PlayMobile)`);
                // Let Cognito handle it since it uses AWS SMS anyway
            }
        } else {
            console.log(`🌍 Non-Uzbekistan number: ${phoneNumber}, using Cognito SMS`);
        }

        return event;

    } catch (error) {
        console.error('❌ Cognito SMS handler error:', error);
        return event;
    }
};

// AWS SMS sending function (for non-Uzbekistan numbers)
const sendSmsViaAws = async (phoneNumber: string, message: string): Promise<boolean> => {
    try {
        // Format phone number (ensure it starts with +)
        let formattedPhoneNumber = phoneNumber;
        if (!formattedPhoneNumber.startsWith('+')) {
            formattedPhoneNumber = `+${formattedPhoneNumber}`;
        }

        const command = new SendTextMessageCommand({
            DestinationPhoneNumber: formattedPhoneNumber,
            MessageBody: message,
            OriginationIdentity: process.env.SMS_ORIGINATION_IDENTITY,
            ConfigurationSetName: process.env.SMS_CONFIGURATION_SET_NAME
        });

        const result = await smsClient.send(command);

        if (result.MessageId) {
            console.log(`✅ AWS SMS sent successfully to ${formattedPhoneNumber}. MessageId: ${result.MessageId}`);
            return true;
        } else {
            console.log(`❌ AWS SMS failed for ${formattedPhoneNumber}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending AWS SMS to ${phoneNumber}:`, error);
        return false;
    }
};

// Single SMS handler with operator-specific routing
const handleSingleSms = async (payload: { phone: string; message: string; messageId?: string }) => {
    try {
        const { phone, message, messageId } = payload;

        // Get operator routing information
        const routing = getUzbekistanOperatorRouting(phone);
        let success = false;
        let provider = 'aws';

        if (routing.isUzbekistan && routing.usePlayMobile) {
            // Use PlayMobile for supported Uzbekistan operators
            success = await sendSmsViaLocalApi(phone, message, messageId);
            provider = 'playmobile';
        } else {
            // Use AWS SMS for Ucell, international numbers, or fallback
            success = await sendSmsViaAws(phone, message);
            provider = 'aws';
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success,
                message: success ? 'SMS sent successfully' : 'SMS failed',
                provider: provider,
                operator: routing.operator,
                routing: routing.isUzbekistan ? (routing.usePlayMobile ? 'PlayMobile' : 'AWS (Ucell bypass)') : 'AWS (International)'
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};

// Bulk SMS handler with operator-specific routing
const handleBulkSms = async (payload: { phones: string[]; message: string }) => {
    try {
        const { phones, message } = payload;
        const results = [];

        // Process in batches to avoid timeout
        const batchSize = 10;
        for (let i = 0; i < phones.length; i += batchSize) {
            const batch = phones.slice(i, i + batchSize);
            const batchPromises = batch.map(async (phone, index) => {
                try {
                    const routing = getUzbekistanOperatorRouting(phone);
                    let success = false;
                    let provider = 'aws';
                    const messageId = `Bulk${Date.now()}_${i + index}`;

                    if (routing.isUzbekistan && routing.usePlayMobile) {
                        // Use PlayMobile for supported operators
                        success = await sendSmsViaLocalApi(phone, message, messageId);
                        provider = 'playmobile';
                    } else {
                        // Use AWS for Ucell, international, or fallback
                        success = await sendSmsViaAws(phone, message);
                        provider = 'aws';
                    }

                    return {
                        phone,
                        success,
                        provider,
                        operator: routing.operator,
                        routing: routing.isUzbekistan ? (routing.usePlayMobile ? 'PlayMobile' : 'AWS (Ucell bypass)') : 'AWS (International)'
                    };
                } catch (error) {
                    return { phone, success: false, error: error instanceof Error ? error.message : String(error) };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                results,
                summary: {
                    total: results.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    playmobile_provider: results.filter(r => r.provider === 'playmobile').length,
                    aws_provider: results.filter(r => r.provider === 'aws').length,
                    ucell_bypass: results.filter(r => r.routing === 'AWS (Ucell bypass)').length
                }
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};

// API Gateway handler for direct SMS
const handleApiGatewaySms = async (event: ApiGatewayEvent) => {
    try {
        const body = JSON.parse(event.body);
        const { phone, message, type = 'single' } = body;

        if (type === 'bulk') {
            return await handleBulkSms({ phones: phone, message });
        } else {
            return await handleSingleSms({ phone, message });
        }

    } catch (error) {
        console.error('❌ API Gateway SMS handler error:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        };
    }
};

const fetchPosts = async () => {
    return await DB.query(
        `SELECT pp.id,
                pa.arn,
                po.title,
                po.description,
                st.family_name,
                st.given_name,
                pses.chat_id,
                pses.language,
                pa.phone_number,
                po.priority,
                CASE
                    WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                         (po.priority = 'medium' AND sc.sms_medium = true) OR
                         (po.priority = 'low' AND sc.sms_low = true)
                        THEN true
                    ELSE false
                    END AS sms
         FROM PostParent AS pp
                  INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                  INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                  LEFT JOIN Post AS po ON ps.post_id = po.id
                  INNER JOIN Student AS st ON ps.student_id = st.id
                  LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                  INNER JOIN School AS sc ON st.school_id = sc.id
         WHERE pa.arn IS NOT NULL
           AND pp.push = false
           AND pp.viewed_at IS NULL LIMIT 25;`);
};

// Helper function to detect token type (iOS APNS vs Android FCM)
const detectTokenType = (token: string): { channelType: ChannelType; isValid: boolean; platform: string } => {
    if (!token) {
        return { channelType: ChannelType.GCM, isValid: false, platform: 'unknown' };
    }

    // iOS APNS tokens are typically 64 characters of hexadecimal (device tokens)
    const iosTokenPattern = /^[a-fA-F0-9]{64,}$/;

    // FCM tokens contain colons and are much longer
    const fcmTokenPattern = /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/;

    if (iosTokenPattern.test(token)) {
        return { channelType: ChannelType.APNS, isValid: true, platform: 'iOS' };
    } else if (fcmTokenPattern.test(token) || token.includes(':')) {
        return { channelType: ChannelType.GCM, isValid: true, platform: 'Android' };
    } else {
        return { channelType: ChannelType.GCM, isValid: true, platform: 'Android (assumed)' };
    }
};

// Helper function to get localized text
const getLocalizedText = (language: string, type: 'title' | 'body' | 'sms', data: any) => {
    const studentName = `${data.given_name} ${data.family_name}`;

    const texts = {
        jp: {
            title: `新しい投稿: ${data.title}`,
            body: `${studentName}への新しいメッセージがあります`,
            sms: `新しい投稿: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName}宛 リンク: https://appuri-hogosha.vercel.app/parentnotification`
        },
        ru: {
            title: `Новый пост: ${data.title}`,
            body: `Новое сообщение для ${studentName}`,
            sms: `Новый пост: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} для ${studentName} ссылка: https://appuri-hogosha.vercel.app/parentnotification`
        },
        uz: {
            title: `Yangi post: ${data.title}`,
            body: `${studentName} uchun yangi xabar`,
            sms: `Yangi post: ${data.title} - ${data.description ? data.description.substring(0, 50) + '...' : ''} ${studentName} uchun havola: https://appuri-hogosha.vercel.app/parentnotification`
        }
    };

    return texts[language as keyof typeof texts]?.[type] || texts.uz[type];
};

// Send push notification via AWS End User Messaging (unchanged from original)
const sendPushNotification = async (post: any): Promise<boolean> => {
    try {
        if (!post.arn) {
            console.log(`No push token for post ${post.id}`);
            return false;
        }

        const { channelType, isValid, platform } = detectTokenType(post.arn);

        if (!isValid) {
            console.log(`Invalid token format for post ${post.id}`);
            return false;
        }

        const title = getLocalizedText(post.language, 'title', post);
        const body = getLocalizedText(post.language, 'body', post);

        const messageData = {
            url: `jduapp://(tabs)/(home)/message/${post.id}`,
            post_id: post.id.toString(),
            priority: post.priority,
            student_name: `${post.given_name} ${post.family_name}`,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        };

        let messageConfiguration: DirectMessageConfiguration = {};

        if (channelType === ChannelType.APNS) {
            // iOS Configuration
            messageConfiguration = {
                APNSMessage: {
                    Title: title,
                    Body: body,
                    Priority: 'high',
                    Sound: 'default',
                    Badge: 1,
                    Action: 'OPEN_APP',
                    TimeToLive: 86400,
                    SilentPush: false,
                    Data: messageData,
                    RawContent: JSON.stringify({
                        aps: {
                            alert: {
                                title: title,
                                body: body
                            },
                            sound: 'default',
                            badge: 1,
                            'mutable-content': 1,
                            'content-available': 1
                        },
                        data: messageData
                    })
                }
            };
        } else {
            // Android Configuration
            messageConfiguration = {
                GCMMessage: {
                    Title: title,
                    Body: body,
                    Priority: 'high',
                    Data: messageData,
                    RawContent: JSON.stringify({
                        notification: {
                            title: title,
                            body: body,
                            icon: 'ic_notification',
                            color: '#005678',
                            click_action: 'FLUTTER_NOTIFICATION_CLICK',
                            channel_id: 'default',
                            priority: 'high'
                        },
                        data: {
                            url: `jduapp://(tabs)/(home)/message/${post.id}`,
                            post_id: post.id.toString(),
                            priority: post.priority,
                            student_name: `${post.given_name} ${post.family_name}`,
                            test_type: 'production',
                            title: title,
                            body: body,
                            click_action: 'FLUTTER_NOTIFICATION_CLICK'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                title: title,
                                body: body,
                                icon: 'ic_notification',
                                color: '#005678',
                                channel_id: 'default',
                                notification_priority: 'PRIORITY_HIGH',
                                default_sound: true,
                                default_vibrate_timings: true
                            }
                        }
                    })
                }
            };
        }

        const command = new SendMessagesCommand({
            ApplicationId: process.env.PINPOINT_APP_ID!,
            MessageRequest: {
                Addresses: {
                    [post.arn]: {
                        ChannelType: channelType
                    }
                },
                MessageConfiguration: messageConfiguration
            }
        });

        const result = await pinpointClient.send(command);
        const messageResult = result.MessageResponse?.Result?.[post.arn];

        if (messageResult?.DeliveryStatus === 'SUCCESSFUL') {
            console.log(`✅ Push notification sent successfully for post ${post.id} via ${platform}`);
            return true;
        } else {
            console.log(`❌ Push notification failed for post ${post.id} via ${platform}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending push notification for post ${post.id}:`, error);
        return false;
    }
};

// Enhanced SMS function for posts with operator-specific routing
const sendSMS = async (post: any): Promise<boolean> => {
    try {
        if (!post.phone_number) {
            console.log(`No phone number for post ${post.id}`);
            return false;
        }

        // Get operator routing information
        const routing = getUzbekistanOperatorRouting(post.phone_number);

        if (routing.isUzbekistan) {
            console.log(`🇺🇿 Uzbekistan number detected: ${post.phone_number} (${routing.operator})`);

            // Generate SMS text using your format
            let text = '';
            if (post.language === 'jp') {
                text = '新しい投稿: ' + post.title + ' に ' + post.family_name + ' リンク: https://appuri-hogosha.vercel.app/parentnotification';
            } else if (post.language === 'ru') {
                text = 'Новый пост: ' + post.title + ' для ' + post.family_name + ' ссылка: https://appuri-hogosha.vercel.app/parentnotification';
            } else {
                text = 'Yangi post: ' + post.title + ' uchun ' + post.family_name + ' havola: https://appuri-hogosha.vercel.app/parentnotification';
            }

            if (routing.usePlayMobile) {
                console.log(`📤 Routing ${routing.operator} via PlayMobile API`);

                // Use enhanced API with cost protection
                const result = await sendSmsViaLocalApiWithProtection(
                    post.phone_number,
                    text,
                    post.id,
                    post.priority === 'high' ? 'high' : 'normal'
                );

                // Track the message for monitoring
                if (result.success && result.messageId) {
                    smsStatusTracker.trackMessage(result.messageId, post.phone_number);
                }

                // Log detailed result
                if (!result.success) {
                    console.error(`❌ PlayMobile SMS failed for post ${post.id}: ${result.reason}`);
                    diagnoseSmsDeliveryIssue(post.phone_number);
                }

                return result.success;
            } else {
                console.log(`📤 Routing ${routing.operator} via AWS SMS (PlayMobile bypass)`);

                // Format for AWS (needs + prefix)
                let formattedPhoneNumber = post.phone_number;
                if (!formattedPhoneNumber.startsWith('+')) {
                    formattedPhoneNumber = `+${formattedPhoneNumber}`;
                }

                return await sendSmsViaAws(formattedPhoneNumber, text);
            }
        } else {
            // For non-Uzbekistan numbers, format and use AWS
            let formattedPhoneNumber = post.phone_number;
            if (!formattedPhoneNumber.startsWith('+')) {
                formattedPhoneNumber = `+${formattedPhoneNumber}`;
            }

            console.log(`🌍 Routing international number via AWS: ${formattedPhoneNumber}`);
            const smsText = getLocalizedText(post.language, 'sms', post);
            return await sendSmsViaAws(formattedPhoneNumber, smsText);
        }

    } catch (error) {
        console.error(`❌ Error sending SMS for post ${post.id}:`, error);
        return false;
    }
};

// Send Telegram notification (unchanged from original)
const sendTelegramNotification = async (post: any): Promise<boolean> => {
    try {
        if (!post.chat_id) {
            return false;
        }

        let text = '', buttonText = '';
        if (post.language === 'jp') {
            text = `新しい投稿: ${post.title} に ${post.given_name} ${post.family_name}`;
            buttonText = '見る';
        } else if (post.language === 'ru') {
            text = `Новый пост: ${post.title} для ${post.given_name} ${post.family_name}`;
            buttonText = 'Посмотреть';
        } else {
            text = `Yangi post: ${post.title} uchun ${post.given_name} ${post.family_name}`;
            buttonText = 'Ko\'rish';
        }

        const button = Markup.inlineKeyboard([
            Markup.button.url(buttonText, "https://appuri-hogosha.vercel.app/parentnotification")
        ]);

        await bot.telegram.sendMessage(post.chat_id, text, button);
        console.log(`✅ Telegram notification sent for post ${post.id}`);
        return true;
    } catch (error) {
        console.error(`❌ Telegram error for post ${post.id}:`, error);
        return false;
    }
};

// Process notifications with enhanced SMS routing
const sendNotifications = async (posts: any[]) => {
    if (!posts.length) return [];

    const notificationPromises = posts.map(async (post) => {
        try {
            let hasSuccessfulNotification = false;

            // Send Telegram notification
            const telegramSuccess = await sendTelegramNotification(post);
            if (telegramSuccess) {
                hasSuccessfulNotification = true;
            }

            // Send SMS with smart routing (if enabled for this priority level)
            if (post.sms) {
                const smsSuccess = await sendSMS(post);
                if (smsSuccess) {
                    hasSuccessfulNotification = true;
                }
            }

            // Send Push notification
            const pushSuccess = await sendPushNotification(post);
            if (pushSuccess) {
                hasSuccessfulNotification = true;
            }

            // Return post ID if at least one notification was successful
            if (hasSuccessfulNotification) {
                return post.id;
            } else {
                console.log(`❌ All notifications failed for post ${post.id}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error processing post ${post.id}:`, error);
            return null;
        }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);

    // Filter out successful notifications
    return results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(Boolean);
};

// Update database for successful notifications
const updateDatabase = async (ids: any[]) => {
    if (!ids.length) return;

    await DB.execute(`UPDATE PostParent SET push = true WHERE id IN (${ids.join(',')});`);
};

// Main notification function
const pushNotifications = async () => {
    console.time('total-execution');

    try {
        console.time('db-fetch');
        const posts = await fetchPosts();
        console.timeEnd('db-fetch');

        if (!posts.length) {
            console.log("No posts found to process");
            return { message: "no posts found", count: 0 };
        }

        console.log(`Processing ${posts.length} notifications...`);

        console.time('send-notifications');
        const successNotifications = await sendNotifications(posts);
        console.timeEnd('send-notifications');

        if (successNotifications.length) {
            console.time('db-update');
            await updateDatabase(successNotifications);
            console.timeEnd('db-update');
        }

        console.log(`✅ Successfully processed ${successNotifications.length}/${posts.length} notifications`);
        return {
            message: "success",
            count: successNotifications.length,
            total: posts.length
        };
    } catch (e) {
        console.error("❌ Error in pushNotifications:", e);
        return { message: "error", error: String(e) };
    } finally {
        console.timeEnd('total-execution');
    }
};

// Webhook Handler (updated for PlayMobile SMS status handling)
class WebhookHandler {
    static async handle(event: ApiGatewayEvent, context: any) {
        try {
            const body = JSON.parse(event.body);
            const { type, data } = body;

            switch (type) {
                case 'SMS_DELIVERY_REPORT':
                    return await this.handleSmsDeliveryReport(data);

                case 'PLAYMOBILE_STATUS':
                    return await this.handlePlayMobileStatus(body);

                case 'SMS_REPLY':
                    return await this.handleSmsReply(data);

                default:
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Unknown webhook type' })
                    };
            }

        } catch (error) {
            console.error('❌ Webhook handler error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
            };
        }
    }

    static async handlePlayMobileStatus(data: any) {
        console.log('📨 PlayMobile SMS status received:', data);

        try {
            if (data.messages && Array.isArray(data.messages)) {
                for (const message of data.messages) {
                    const { 'message-id': messageId, status, 'status-date': statusDate, description } = message;

                    console.log(`📊 SMS Status Update: ${messageId} -> ${status} at ${statusDate}`);

                    // Update status tracker
                    smsStatusTracker.updateStatus(messageId, status, description);

                    // Log status meanings
                    const statusMeanings: Record<string, string> = {
                        'Delivered': '✅ Successfully delivered to recipient',
                        'Transmitted': '📤 Sent to operator, awaiting delivery confirmation',
                        'NotDelivered': '❌ Not delivered (insufficient funds, blocked, etc)',
                        'Rejected': '🚫 Rejected (number in blacklist)',
                        'Failed': '💥 Failed to send (wrong originator, etc)',
                        'Expired': '⏰ Expired (recipient offline for 24h)'
                    };

                    const meaning = statusMeanings[status] || 'Unknown status';
                    console.log(`   💬 Status meaning: ${meaning}`);

                    if (description) {
                        console.log(`   📝 Description: ${description}`);
                    }

                    // For "Transmitted" status, provide additional context
                    if (status === 'Transmitted') {
                        console.log(`   ℹ️  This is normal - message sent to operator, final delivery may take up to 24 hours`);
                    }

                    // Store status in database or send to analytics
                    // await DB.execute(`UPDATE sms_logs SET status = ?, status_date = ?, description = ? WHERE message_id = ?`, 
                    //   [status, statusDate, description, messageId]);
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'PlayMobile status processed successfully' })
            };

        } catch (error) {
            console.error('❌ Error processing PlayMobile status:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to process status' })
            };
        }
    }

    static async handleSmsDeliveryReport(data: any) {
        console.log('📨 SMS delivery report:', data);

        // Store delivery status in database or send to analytics
        // await DatabaseService.updateSmsStatus(data.messageId, data.status);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Delivery report processed' })
        };
    }

    static async handleSmsReply(data: any) {
        console.log('📨 SMS reply received:', data);

        // Process incoming SMS reply
        // Could trigger other workflows or store in database

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'SMS reply processed' })
        };
    }
}

// Main Lambda handler with event routing
export const handler = async (event: any, context: any) => {
    console.log("🚀 Starting enhanced notification handler");
    console.log("📥 Event:", JSON.stringify(event, null, 2));

    const eventSource = detectEventSource(event);
    console.log(`📍 Event source detected: ${eventSource}`);

    try {
        switch (eventSource) {
            case 'COGNITO':
                console.log('🔐 Processing Cognito SMS trigger');
                return await handleCognitoSms(event as CognitoEvent);

            case 'API_GATEWAY':
                console.log('🌐 Processing API Gateway request');
                const path = event.path;
                const method = event.httpMethod;

                if (path === '/sms' && method === 'POST') {
                    return await handleApiGatewaySms(event as ApiGatewayEvent);
                }

                if (path === '/sms/diagnostics' && method === 'GET') {
                    const diagnostics = smsStatusTracker.getDiagnostics();
                    await smsStatusTracker.checkPendingMessages();

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            ...diagnostics,
                            timestamp: new Date().toISOString(),
                            message: 'SMS diagnostics retrieved successfully'
                        })
                    };
                }

                if (path === '/sms/credentials' && method === 'GET') {
                    const credentialTest = await verifyPlayMobileCredentials();

                    return {
                        statusCode: credentialTest.valid ? 200 : 400,
                        body: JSON.stringify({
                            valid: credentialTest.valid,
                            reason: credentialTest.reason,
                            config: {
                                brokerUrl: process.env.BROKER_URL || 'NOT_SET',
                                brokerAuthLength: process.env.BROKER_AUTH ? process.env.BROKER_AUTH.length : 0,
                                brokerAuthSample: process.env.BROKER_AUTH ? process.env.BROKER_AUTH.substring(0, 10) + '...' : 'NOT_SET'
                            },
                            timestamp: new Date().toISOString()
                        })
                    };
                }

                if (path === '/sms/test' && method === 'POST') {
                    try {
                        const body = JSON.parse(event.body);
                        const { phone, message = 'Test message from JDU', testApi = false } = body;

                        if (!phone) {
                            return {
                                statusCode: 400,
                                body: JSON.stringify({ error: 'Phone number is required' })
                            };
                        }

                        // Run diagnostics
                        diagnoseSmsDeliveryIssue(phone);

                        let testResult = null;
                        if (testApi && isUzbekistanNumber(phone)) {
                            console.log('🧪 Testing PlayMobile API connection...');
                            testResult = await sendSmsViaLocalApiWithProtection(phone, message, 'TEST');
                        }

                        return {
                            statusCode: 200,
                            body: JSON.stringify({
                                message: 'SMS diagnostics completed - check logs',
                                phone: phone,
                                isValidUzbekistan: isUzbekistanNumber(phone),
                                canSend: smsCounter.canSend(),
                                quota: smsCounter.getRemainingQuota(),
                                credentials: {
                                    brokerUrl: process.env.BROKER_URL ? 'Set' : 'Missing',
                                    brokerAuth: process.env.BROKER_AUTH ? 'Set' : 'Missing'
                                },
                                testResult: testResult
                            })
                        };

                    } catch (error) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ error: 'Invalid request body' })
                        };
                    }
                }

                if (path === '/webhook/playmobile' && method === 'POST') {
                    return await WebhookHandler.handle(event as ApiGatewayEvent, context);
                }

                if (path === '/webhook' && method === 'POST') {
                    return await WebhookHandler.handle(event as ApiGatewayEvent, context);
                }

                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Route not found' })
                };

            case 'DIRECT_INVOKE':
                console.log('🎯 Processing direct invoke');
                const { action, payload } = event as DirectInvokeEvent;

                if (action === 'SEND_SMS') {
                    return await handleSingleSms(payload);
                } else if (action === 'BULK_SMS') {
                    return await handleBulkSms(payload);
                }

                throw new Error(`Unknown action: ${action}`);

            case 'SCHEDULED':
                console.log('⏰ Processing scheduled task');
                const result = await pushNotifications();
                await DB.closeConnection();
                return {
                    statusCode: 200,
                    body: JSON.stringify(result)
                };

            default:
                console.log('📱 Processing as default notification task');
                const defaultResult = await pushNotifications();
                await DB.closeConnection();
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
                body: JSON.stringify({ message: "error", error: error instanceof Error ? error.message : String(error) })
            };
        }
    }
};

// For local development - run directly
if (isLocal) {
    console.log('🚀 Running locally...');
    handler({}, {}).then(result => {
        console.log('📊 Result:', result);
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
}