import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { PlayMobileCredentialsService } from '../../services/playmobile/credentials';
import { DiagnosticsService } from '../../utils/diagnostics';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { smsCounter } from '../../config/rate-limits';
import { ApiGatewayEvent } from '../../types/events';
import { ApiResponse, BulkSmsResult } from '../../types/responses';

export class ApiHandler {
    private credentialsService: PlayMobileCredentialsService;
    private diagnosticsService: DiagnosticsService;

    constructor(
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService
    ) {
        this.credentialsService = new PlayMobileCredentialsService();
        this.diagnosticsService = new DiagnosticsService();
    }

    async handleApiRequest(event: ApiGatewayEvent): Promise<ApiResponse> {
        const path = event.path;
        const method = event.httpMethod;

        console.log(`🌐 Processing API request: ${method} ${path}`);

        try {
            switch (true) {
                case path === '/sms' && method === 'POST':
                    return await this.handleSmsRequest(event);

                case path === '/sms/diagnostics' && method === 'GET':
                    return await this.handleDiagnostics();

                case path === '/sms/credentials' && method === 'GET':
                    return await this.handleCredentialsCheck();

                case path === '/sms/test' && method === 'POST':
                    return await this.handleSmsTest(event);

                case path === '/webhook/playmobile' && method === 'POST':
                case path === '/webhook' && method === 'POST':
                    return await this.handleWebhook(event);

                default:
                    return {
                        statusCode: 404,
                        body: JSON.stringify({ error: 'Route not found' })
                    };
            }
        } catch (error) {
            console.error('❌ API request error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Internal server error' })
            };
        }
    }

    async handleDirectInvoke(action: string, payload: any): Promise<ApiResponse> {
        console.log(`🎯 Processing direct invoke: ${action}`);

        try {
            switch (action) {
                case 'SEND_SMS':
                    return await this.handleSingleSms(payload);

                case 'BULK_SMS':
                    return await this.handleBulkSms(payload);

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error('❌ Direct invoke error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
            };
        }
    }

    private async handleSmsRequest(event: ApiGatewayEvent): Promise<ApiResponse> {
        const body = JSON.parse(event.body);
        const { phone, message, type = 'single' } = body;

        if (type === 'bulk') {
            return await this.handleBulkSms({ phones: phone, message });
        } else {
            return await this.handleSingleSms({ phone, message });
        }
    }

    private async handleSingleSms(payload: { phone: string; message: string; messageId?: string }): Promise<ApiResponse> {
        try {
            const { phone, message, messageId } = payload;

            // Get operator routing information
            const routing = getUzbekistanOperatorRouting(phone);
            let success = false;
            let provider = 'aws';

            if (routing.isUzbekistan && routing.usePlayMobile) {
                // Use PlayMobile for supported Uzbekistan operators
                success = await this.playMobileService.sendSms(phone, message, messageId);
                provider = 'playmobile';
            } else {
                // Use AWS SMS for Ucell, international numbers, or fallback
                success = await this.awsSmsService.sendSms(phone, message);
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
    }

    private async handleBulkSms(payload: { phones: string[]; message: string }): Promise<ApiResponse> {
        try {
            const { phones, message } = payload;
            const results: BulkSmsResult[] = [];

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
                            success = await this.playMobileService.sendSms(phone, message, messageId);
                            provider = 'playmobile';
                        } else {
                            // Use AWS for Ucell, international, or fallback
                            success = await this.awsSmsService.sendSms(phone, message);
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
                        return {
                            phone,
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        };
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
    }

    private async handleDiagnostics(): Promise<ApiResponse> {
        const diagnostics = this.diagnosticsService.getDiagnostics();
        await this.diagnosticsService.checkPendingMessages();

        return {
            statusCode: 200,
            body: JSON.stringify({
                ...diagnostics,
                timestamp: new Date().toISOString(),
                message: 'SMS diagnostics retrieved successfully'
            })
        };
    }

    private async handleCredentialsCheck(): Promise<ApiResponse> {
        const credentialTest = await this.credentialsService.verifyCredentials();

        return {
            statusCode: credentialTest.valid ? 200 : 400,
            body: JSON.stringify({
                valid: credentialTest.valid,
                reason: credentialTest.reason,
                timestamp: new Date().toISOString()
            })
        };
    }

    private async handleSmsTest(event: ApiGatewayEvent): Promise<ApiResponse> {
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
            this.diagnosticsService.diagnoseSmsDeliveryIssue(phone);

            let testResult = null;
            if (testApi) {
                const routing = getUzbekistanOperatorRouting(phone);
                if (routing.isUzbekistan) {
                    console.log('🧪 Testing PlayMobile API connection...');
                    testResult = await this.playMobileService.sendSmsWithProtection(phone, message, 'TEST');
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'SMS diagnostics completed - check logs',
                    phone: phone,
                    canSend: smsCounter.canSend(),
                    quota: smsCounter.getRemainingQuota(),
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

    private async handleWebhook(event: ApiGatewayEvent): Promise<ApiResponse> {
        try {
            const body = JSON.parse(event.body);
            console.log('📨 Webhook received:', body);

            // Process webhook (status updates, delivery reports, etc.)
            // This would typically update database records or trigger other actions

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Webhook processed successfully' })
            };

        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to process webhook' })
            };
        }
    }
}