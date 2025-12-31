import { config } from 'dotenv';
import DatabaseClient from '../db-client';
import {
    getUzbekistanOperatorRouting,
    checkSmsCharacterLimit,
} from '../utils/validation';
import { smsCounter, SMS_RATE_LIMIT } from '../config/rate-limits';

config();

const DB = new DatabaseClient();

interface SmsTestResult {
    phone: string;
    isUzbekistan: boolean;
    operator: string;
    provider: 'PlayMobile' | 'AWS SMS';
    charCheck: {
        withinLimit: boolean;
        encoding: string;
        parts: number;
        cost: string;
    };
    rateLimitStatus: {
        canSend: boolean;
        dailyRemaining: number;
        hourlyRemaining: number;
    };
    sendAttempt?: {
        success: boolean;
        messageId?: string;
        error?: string;
    };
}

const testSmsPhoneNumber = async (
    phoneNumber: string,
    message: string = 'Test SMS from JDU notification system'
): Promise<SmsTestResult> => {
    console.log('\n' + '═'.repeat(80));
    console.log(`📱 Testing SMS to: ${phoneNumber}`);
    console.log('═'.repeat(80));

    const result: SmsTestResult = {
        phone: phoneNumber,
        isUzbekistan: false,
        operator: 'Unknown',
        provider: 'AWS SMS',
        charCheck: {
            withinLimit: false,
            encoding: 'Unknown',
            parts: 0,
            cost: '0 SMS',
        },
        rateLimitStatus: {
            canSend: false,
            dailyRemaining: 0,
            hourlyRemaining: 0,
        },
    };

    // Step 1: Validate phone number and detect operator
    console.log('\n1️⃣  Phone Number Analysis:');
    const routing = getUzbekistanOperatorRouting(phoneNumber);
    result.isUzbekistan = routing.isUzbekistan;
    result.operator = routing.operator;
    result.provider = routing.usePlayMobile ? 'PlayMobile' : 'AWS SMS';

    console.log(
        `   Country: ${routing.isUzbekistan ? '🇺🇿 Uzbekistan' : '🌍 International'}`
    );
    console.log(`   Operator: ${routing.operator}`);
    console.log(`   Provider: ${result.provider}`);

    // Step 2: Check message character limits
    console.log('\n2️⃣  Message Analysis:');
    const charCheck = checkSmsCharacterLimit(message);
    result.charCheck = charCheck;

    console.log(`   Message length: ${message.length} characters`);
    console.log(`   Encoding: ${charCheck.encoding}`);
    console.log(`   SMS Parts: ${charCheck.parts}`);
    console.log(`   Cost: ${charCheck.cost}`);

    if (!charCheck.withinLimit) {
        console.warn(
            `   ⚠️  WARNING: This message requires multiple SMS parts!`
        );
    }

    // Step 3: Check rate limits
    console.log('\n3️⃣  Rate Limit Status:');
    const quotaStatus = smsCounter.getRemainingQuota();
    result.rateLimitStatus = {
        canSend: smsCounter.canSend(),
        dailyRemaining: quotaStatus.daily,
        hourlyRemaining: quotaStatus.hourly,
    };

    console.log(
        `   Daily SMS sent: ${SMS_RATE_LIMIT.DAILY_LIMIT - quotaStatus.daily}/${SMS_RATE_LIMIT.DAILY_LIMIT}`
    );
    console.log(`   Remaining today: ${quotaStatus.daily}`);
    console.log(
        `   Hourly SMS sent: ${SMS_RATE_LIMIT.HOURLY_LIMIT - quotaStatus.hourly}/${SMS_RATE_LIMIT.HOURLY_LIMIT}`
    );
    console.log(`   Remaining this hour: ${quotaStatus.hourly}`);

    if (!smsCounter.canSend()) {
        console.error(`   ❌ RATE LIMIT EXCEEDED - Cannot send SMS`);
        result.sendAttempt = {
            success: false,
            error: `Rate limit exceeded. Daily: ${quotaStatus.daily}, Hourly: ${quotaStatus.hourly}`,
        };
        return result;
    }

    // Step 4: Perform actual SMS send (optional based on user input)
    console.log('\n4️⃣  SMS Send Simulation:');
    console.log(`   ${result.provider} endpoint ready`);
    console.log(
        `   Message preview: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`
    );

    return result;
};

const testSmsFromDatabase = async (
    limit: number = 5
): Promise<SmsTestResult[]> => {
    console.log('\n🔍 Fetching test phone numbers from database...');

    const parents = await DB.query(
        `
        SELECT 
            id,
            phone_number
        FROM Parent 
        WHERE phone_number IS NOT NULL 
        AND phone_number != ''
        LIMIT ?
    `,
        [limit]
    );

    if (!parents || parents.length === 0) {
        console.log('❌ No phone numbers found in database');
        return [];
    }

    console.log(`\n✅ Found ${parents.length} phone numbers to test\n`);

    const results: SmsTestResult[] = [];
    for (const parent of parents) {
        const result = await testSmsPhoneNumber(parent.phone_number);
        results.push(result);
    }

    return results;
};

const printSummary = (results: SmsTestResult[]) => {
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(80));

    const summary = {
        total: results.length,
        uzbekistan: results.filter(r => r.isUzbekistan).length,
        international: results.filter(r => !r.isUzbekistan).length,
        playMobile: results.filter(r => r.provider === 'PlayMobile').length,
        awsSms: results.filter(r => r.provider === 'AWS SMS').length,
        multipart: results.filter(r => !r.charCheck.withinLimit).length,
        rateLimitExceeded: results.filter(r => !r.rateLimitStatus.canSend)
            .length,
    };

    console.log(`\nTotal tests: ${summary.total}`);
    console.log(`\nPhone Number Distribution:`);
    console.log(
        `  🇺🇿 Uzbekistan: ${summary.uzbekistan} (${((summary.uzbekistan / summary.total) * 100).toFixed(1)}%)`
    );
    console.log(
        `  🌍 International: ${summary.international} (${((summary.international / summary.total) * 100).toFixed(1)}%)`
    );

    console.log(`\nSMS Provider Routing:`);
    console.log(
        `  🟢 PlayMobile: ${summary.playMobile} (${((summary.playMobile / summary.total) * 100).toFixed(1)}%)`
    );
    console.log(
        `  🔵 AWS SMS: ${summary.awsSms} (${((summary.awsSms / summary.total) * 100).toFixed(1)}%)`
    );

    console.log(`\nMessage Encoding:`);
    console.log(`  ✅ Single SMS: ${summary.total - summary.multipart}`);
    console.log(`  ⚠️  Multi-part SMS: ${summary.multipart} (higher cost!)`);

    console.log(`\nRate Limit Status:`);
    console.log(`  ✅ Can send: ${summary.total - summary.rateLimitExceeded}`);
    console.log(`  ❌ Rate limited: ${summary.rateLimitExceeded}`);

    // Operators breakdown
    const operators: Record<string, number> = {};
    results.forEach(r => {
        operators[r.operator] = (operators[r.operator] || 0) + 1;
    });

    console.log(`\nOperators Detected:`);
    Object.entries(operators)
        .sort(([, a], [, b]) => b - a)
        .forEach(([op, count]) => {
            console.log(`  ${op}: ${count}`);
        });

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (summary.multipart > 0) {
        console.log(
            `  ⚠️  ${summary.multipart} numbers have multi-part messages. Consider shorter text.`
        );
    }
    if (summary.rateLimitExceeded > 0) {
        console.log(
            `  ⚠️  ${summary.rateLimitExceeded} numbers exceed rate limits. Upgrade SMS plan.`
        );
    }
    if (summary.uzbekistan > 0 && summary.playMobile === 0) {
        console.log(
            `  ℹ️  All Uzbekistan users use AWS SMS. Verify PlayMobile credentials.`
        );
    }

    console.log('\n✅ Testing complete!\n');
};

const main = async () => {
    console.log('🚀 SMS Sending Test Utility');
    console.log('═'.repeat(80));

    // Check if phone number provided as command line argument
    const phoneArg = process.argv[2];
    const limitArg = parseInt(process.argv[3] || '5');

    if (phoneArg) {
        // Test single phone number
        console.log(`\n📞 Testing single phone number: ${phoneArg}`);
        const result = await testSmsPhoneNumber(phoneArg);
        console.log('\n📋 Test Result:');
        console.log(JSON.stringify(result, null, 2));
    } else {
        // Test multiple from database
        console.log(
            `\n📊 Testing up to ${limitArg} phone numbers from database`
        );
        const results = await testSmsFromDatabase(limitArg);
        printSummary(results);
    }
};

main()
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await DB.closeConnection();
        process.exit(0);
    });
