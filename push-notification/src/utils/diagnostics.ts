import { getUzbekistanOperatorRouting } from './validation';
import { smsCounter } from '../config/rate-limits';
import { DiagnosticsResult } from '../types/responses';

export class DiagnosticsService {
    private pendingMessages = new Map<string, { phone: string; timestamp: number; attempts: number }>();

    trackMessage(messageId: string, phone: string): void {
        this.pendingMessages.set(messageId, {
            phone,
            timestamp: Date.now(),
            attempts: 1
        });
    }

    updateStatus(messageId: string, status: string, description?: string): void {
        const message = this.pendingMessages.get(messageId);
        if (message) {
            console.log(`📊 SMS Status Update: ${messageId} -> ${status}`);

            if (['Delivered', 'Failed', 'Rejected', 'Expired'].includes(status)) {
                // Final status - remove from tracking
                this.pendingMessages.delete(messageId);
            }
        }
    }

    async checkPendingMessages(): Promise<void> {
        const now = Date.now();
        const staleThreshold = 30 * 60 * 1000; // 30 minutes

        for (const [messageId, message] of this.pendingMessages) {
            if (now - message.timestamp > staleThreshold) {
                console.warn(`⚠️ SMS ${messageId} to ${message.phone} is stale (${Math.round((now - message.timestamp) / 60000)} minutes)`);
                console.warn(`💡 Possible reasons: recipient phone off, out of coverage, or network issues`);
            }
        }
    }

    getDiagnostics(): DiagnosticsResult {
        const pending = this.pendingMessages.size;
        const oldestTimestamp = Math.min(...Array.from(this.pendingMessages.values()).map(m => m.timestamp));
        const oldestAge = pending > 0 ? Math.round((Date.now() - oldestTimestamp) / 60000) : 0;

        return {
            pendingMessages: pending,
            oldestPendingMinutes: oldestAge,
            rateLimitStatus: smsCounter.getRemainingQuota()
        };
    }

    diagnoseSmsDeliveryIssue(phone: string, status?: string): void {
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
    }
}