import { ENVIRONMENT } from '../../config/environment';
import { CredentialTestResult } from '../../types/responses';

export class PlayMobileCredentialsService {
    async verifyCredentials(): Promise<CredentialTestResult> {
        try {
            if (!ENVIRONMENT.BROKER_URL || !ENVIRONMENT.BROKER_AUTH) {
                return { valid: false, reason: 'Missing BROKER_URL or BROKER_AUTH environment variables' };
            }

            // Test with minimal request
            const headers = {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Basic ' + Buffer.from(ENVIRONMENT.BROKER_AUTH).toString('base64')
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
            console.log(`   🔗 URL: ${ENVIRONMENT.BROKER_URL}/broker-api/send`);
            console.log(`   🗝️  Auth: Basic ${Buffer.from(ENVIRONMENT.BROKER_AUTH).toString('base64').substring(0, 10)}...`);

            const response = await fetch(ENVIRONMENT.BROKER_URL + '/broker-api/send', {
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
    }
}