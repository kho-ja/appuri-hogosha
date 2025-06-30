import { ENVIRONMENT } from '../../config/environment';
import { smsCounter, SMS_RATE_LIMIT } from '../../config/rate-limits';
import { checkSmsCharacterLimit, getUzbekistanOperatorRouting } from '../../utils/validation';
import { SmsResult } from '../../types/responses';

export class PlayMobileService {
    async sendSmsWithProtection(
        phoneNumber: string,
        message: string,
        postId?: string,
        priority: 'low' | 'normal' | 'high' | 'realtime' = 'normal'
    ): Promise<SmsResult> {
        try {
            // 0. Check character limits to prevent unnecessary costs
            const charCheck = checkSmsCharacterLimit(message);
            console.log(`📏 Message analysis:`);
            console.log(`   🔤 Encoding: ${charCheck.encoding}`);
            console.log(`   📊 Parts: ${charCheck.parts} (${charCheck.cost})`);

            if (!charCheck.withinLimit) {
                console.warn(`⚠️ WARNING: Message will cost ${charCheck.cost} - Consider shortening!`);
            }

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
            if (!ENVIRONMENT.BROKER_URL || !ENVIRONMENT.BROKER_AUTH) {
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
            const routing = getUzbekistanOperatorRouting(formattedPhone);
            console.log(`📶 Detected operator: ${routing.operator} for ${formattedPhone}`);

            // 5. Generate unique message ID (max 40 chars as per API docs)
            const messageId = postId ? `JDU${postId}` : `JDU${Date.now()}`;
            if (messageId.length > 40) {
                console.error(`❌ Message ID too long: ${messageId.length} chars`);
                return { success: false, reason: 'Message ID too long' };
            }

            // 6. Prepare headers
            const headers = {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Basic ' + Buffer.from(ENVIRONMENT.BROKER_AUTH).toString('base64')
            };

            // 7. Simple message structure
            const requestBody = {
                "messages": [{
                    "recipient": formattedPhone,
                    "message-id": messageId,
                    "sms": {
                        "originator": "JDU",
                        "ttl": SMS_RATE_LIMIT.MESSAGE_TTL,
                        "content": {
                            "text": message
                        }
                    }
                }]
            };

            console.log(`📤 Sending SMS via PlayMobile API:`);
            console.log(`   📞 To: ${formattedPhone} (${routing.operator})`);
            console.log(`   💰 Cost: ${charCheck.cost}`);

            // 8. Enhanced retry logic
            let lastError: string | undefined;
            for (let attempt = 1; attempt <= SMS_RATE_LIMIT.MAX_RETRIES; attempt++) {
                try {
                    const response = await fetch(ENVIRONMENT.BROKER_URL + '/broker-api/send', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(requestBody),
                    });

                    const responseText = await response.text();
                    console.log(`📥 PlayMobile API Response (attempt ${attempt}):`);
                    console.log(`   🔢 Status: ${response.status}`);
                    console.log(`   📄 Body: ${responseText}`);

                    if (response.status === 200) {
                        console.log(`✅ PlayMobile SMS sent successfully to ${routing.operator} (${charCheck.cost})`);

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

                        const errorCode = String(errorResponse['error-code'] || errorResponse.error_code || 'unknown');
                        const errorDescription = errorResponse['error-description'] || errorResponse.error_description || 'No description provided';

                        console.error(`❌ PlayMobile API Error (${errorCode}): ${errorDescription}`);

                        // Handle specific errors
                        if (errorCode === '105') {
                            return { success: false, reason: 'Too many message IDs - reduce batch size' };
                        } else if (errorCode === '102') {
                            return { success: false, reason: 'Account blocked - contact PlayMobile support immediately' };
                        } else if (errorCode === '202') {
                            return { success: false, reason: `Empty recipient - check ${routing.operator} number format` };
                        }

                        lastError = `API Error ${errorCode}: ${errorDescription}`;

                        // Don't retry on validation errors
                        if (['202', '205', '401', '404'].includes(errorCode)) {
                            break;
                        }
                    } else {
                        lastError = `HTTP ${response.status}: ${responseText}`;
                        console.error(`❌ PlayMobile API returned status: ${response.status} (attempt ${attempt})`);
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
    }

    async sendSms(phoneNumber: string, message: string, postId?: string): Promise<boolean> {
        const result = await this.sendSmsWithProtection(phoneNumber, message, postId);
        return result.success;
    }
}