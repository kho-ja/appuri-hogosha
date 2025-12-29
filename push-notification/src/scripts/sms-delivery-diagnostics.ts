import { config } from 'dotenv';
import DatabaseClient from '../db-client';
import { getUzbekistanOperatorRouting } from '../utils/validation';
import { smsCounter, SMS_RATE_LIMIT } from '../config/rate-limits';

config();

const DB = new DatabaseClient();

interface SmsRecord {
    id: string;
    parent_id: string;
    phone_number: string;
    message_id: string;
    sent_at: Date;
    status: string;
    attempts: number;
    last_error?: string;
}

interface DiagnosticReport {
    totalRecords: number;
    pending: SmsRecord[];
    delivered: SmsRecord[];
    failed: SmsRecord[];
    stale: SmsRecord[];
    issues: string[];
    recommendations: string[];
}

const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
        Transmitted: '📤',
        Delivered: '✅',
        Failed: '❌',
        Rejected: '🚫',
        NotDelivered: '❌',
        Expired: '⏰',
    };
    return colors[status] || '❓';
};

const diagnoseSmsRecord = (record: SmsRecord): string[] => {
    const issues: string[] = [];
    const routing = getUzbekistanOperatorRouting(record.phone_number);
    const now = Date.now();
    const sentTime = new Date(record.sent_at).getTime();
    const ageMinutes = Math.round((now - sentTime) / 60000);
    const ageHours = Math.round(ageMinutes / 60);

    // Issue detection
    if (record.status === 'Transmitted' && ageHours > 24) {
        issues.push(
            `⏰ SMS transmitted 24h+ ago. Check with operator or consider as failed.`
        );
    }

    if (record.status === 'NotDelivered') {
        issues.push(
            `❌ NotDelivered - recipient may be offline, out of credit, or blocked`
        );
        if (routing.operator === 'Ucell') {
            issues.push(
                `💡 Ucell users now route through AWS. Verify SMS delivery settings.`
            );
        }
    }

    if (record.status === 'Failed') {
        issues.push(`Failed to send. Check API credentials and error logs.`);
    }

    if (record.status === 'Rejected') {
        issues.push(
            `Rejected by operator. Number may be in blacklist or originator invalid.`
        );
    }

    if (record.status === 'Expired') {
        issues.push(
            `Message expired - recipient was offline for 24h+ continuously.`
        );
    }

    if (record.attempts > 2) {
        issues.push(
            `Multiple retry attempts (${record.attempts}) - likely delivery issue.`
        );
    }

    if (record.last_error && record.last_error.length > 0) {
        issues.push(`Last error: ${record.last_error}`);
    }

    return issues;
};

const analyzeDeliveryIssues = async () => {
    try {
        console.log('🔍 SMS Delivery Diagnostics\n');
        console.log('═'.repeat(80));

        // Fetch SMS records from database (if table exists)
        // For now, we'll simulate with in-memory diagnostics
        let records: SmsRecord[] = [];

        try {
            // Try to fetch from SMS_Log table if it exists
            records = await DB.query(`
                SELECT 
                    id,
                    parent_id,
                    phone_number,
                    message_id,
                    sent_at,
                    status,
                    attempts,
                    last_error
                FROM SMS_Log
                ORDER BY sent_at DESC
                LIMIT 100
            `);
        } catch {
            console.log(
                '⚠️  SMS_Log table not found. Using simulated diagnostics.\n'
            );

            // Simulate some SMS records for demonstration
            records = [];
        }

        const report: DiagnosticReport = {
            totalRecords: records.length,
            pending: records.filter(r => r.status === 'Transmitted'),
            delivered: records.filter(r => r.status === 'Delivered'),
            failed: records.filter(r =>
                ['Failed', 'Rejected', 'NotDelivered', 'Expired'].includes(
                    r.status
                )
            ),
            stale: [],
            issues: [],
            recommendations: [],
        };

        // Identify stale messages (pending for 30+ minutes)
        const staleThreshold = 30 * 60 * 1000;
        const now = Date.now();

        report.stale = report.pending.filter(r => {
            const sentTime = new Date(r.sent_at).getTime();
            return now - sentTime > staleThreshold;
        });

        console.log('📊 DELIVERY STATUS SUMMARY:\n');
        console.log(`Total SMS records analyzed: ${report.totalRecords}`);
        console.log(`  ✅ Delivered: ${report.delivered.length}`);
        console.log(`  📤 Pending: ${report.pending.length}`);
        console.log(`  ⏰ Stale (pending 30m+): ${report.stale.length}`);
        console.log(`  ❌ Failed/Rejected: ${report.failed.length}`);

        if (report.totalRecords === 0) {
            console.log(
                '\nℹ️  No SMS records found. SMS tracking not yet enabled.\n'
            );
        } else {
            const successRate = (
                (report.delivered.length / report.totalRecords) *
                100
            ).toFixed(1);
            console.log(`\n📈 Success Rate: ${successRate}%\n`);

            // Detailed analysis
            if (report.failed.length > 0) {
                console.log('\n' + '═'.repeat(80));
                console.log('❌ FAILED SMS ANALYSIS:\n');

                report.failed.forEach((sms, idx) => {
                    const routing = getUzbekistanOperatorRouting(
                        sms.phone_number
                    );
                    const sentTime = new Date(sms.sent_at).getTime();
                    const ageMinutes = Math.round((now - sentTime) / 60000);

                    console.log(
                        `${idx + 1}. ${getStatusColor(sms.status)} ${sms.status}`
                    );
                    console.log(`   Phone: ${sms.phone_number}`);
                    console.log(
                        `   Operator: ${routing.operator} (${routing.usePlayMobile ? 'PlayMobile' : 'AWS'})`
                    );
                    console.log(`   Attempts: ${sms.attempts}`);
                    console.log(
                        `   Age: ${ageMinutes} minutes (${Math.round(ageMinutes / 60)} hours)`
                    );

                    if (sms.last_error) {
                        console.log(`   Error: ${sms.last_error}`);
                    }

                    const issues = diagnoseSmsRecord(sms);
                    if (issues.length > 0) {
                        console.log(`   🔧 Issues:`);
                        issues.forEach(issue => {
                            console.log(`      • ${issue}`);
                        });
                    }

                    console.log('');
                });
            }

            if (report.stale.length > 0) {
                console.log('\n' + '═'.repeat(80));
                console.log('⏰ STALE MESSAGES (Pending 30+ minutes):\n');

                report.stale.forEach((sms, idx) => {
                    const sentTime = new Date(sms.sent_at).getTime();
                    const ageMinutes = Math.round((now - sentTime) / 60000);
                    const routing = getUzbekistanOperatorRouting(
                        sms.phone_number
                    );

                    console.log(`${idx + 1}. ${sms.phone_number}`);
                    console.log(
                        `   Pending since: ${Math.round(ageMinutes / 60)} hours ago`
                    );
                    console.log(`   Operator: ${routing.operator}`);
                    console.log(`   Attempts: ${sms.attempts}`);
                    console.log(
                        `   💡 Recipient may be offline or out of coverage`
                    );
                    console.log('');
                });
            }
        }

        // Rate limit status
        console.log('\n' + '═'.repeat(80));
        console.log('⚡ RATE LIMIT STATUS:\n');

        const quotaStatus = smsCounter.getRemainingQuota();
        console.log(
            `Daily: ${SMS_RATE_LIMIT.DAILY_LIMIT - quotaStatus.daily}/${SMS_RATE_LIMIT.DAILY_LIMIT} used`
        );
        console.log(`  Remaining: ${quotaStatus.daily}`);
        console.log(
            `Hourly: ${SMS_RATE_LIMIT.HOURLY_LIMIT - quotaStatus.hourly}/${SMS_RATE_LIMIT.HOURLY_LIMIT} used`
        );
        console.log(`  Remaining: ${quotaStatus.hourly}`);

        if (!smsCounter.canSend()) {
            console.log('\n⚠️  RATE LIMIT EXCEEDED - Cannot send SMS');
        }

        // General recommendations
        console.log('\n' + '═'.repeat(80));
        console.log('💡 RECOMMENDATIONS:\n');

        if (report.totalRecords === 0) {
            console.log('1. Create SMS_Log table to track delivery status');
            console.log(
                '2. Add logging to SMS sending functions (PlayMobile & AWS)'
            );
            console.log(
                '3. Implement webhook handler for SMS delivery confirmations'
            );
        } else {
            const failureRate = (
                (report.failed.length / report.totalRecords) *
                100
            ).toFixed(1);

            if (parseFloat(failureRate) > 10) {
                console.log(
                    `1. High failure rate (${failureRate}%). Check API credentials.`
                );
                console.log('2. Verify PlayMobile and AWS SMS settings');
                console.log(
                    '3. Check operator blacklists for common phone patterns'
                );
            }

            if (report.stale.length > 0) {
                console.log(
                    `1. ${report.stale.length} messages pending 30+ minutes`
                );
                console.log(
                    '2. Consider increasing retry attempts or timeout duration'
                );
            }

            console.log(
                '3. Monitor operator-specific issues (Ucell, Beeline, etc.)'
            );
            console.log(
                '4. Implement SMS delivery status webhook from PlayMobile'
            );
        }

        console.log('\n✅ Diagnostics complete!\n');
    } catch (error) {
        console.error('❌ Error running diagnostics:', error);
    } finally {
        await DB.closeConnection();
    }
};

// Run diagnostics
analyzeDeliveryIssues()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Failed to run diagnostics:', error);
        process.exit(1);
    });
