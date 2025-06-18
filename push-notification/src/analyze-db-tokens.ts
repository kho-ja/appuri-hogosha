import { config } from "dotenv";
import DatabaseClient from "./db-client";
import { ChannelType } from '@aws-sdk/client-pinpoint';

config();

const DB = new DatabaseClient();

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

const analyzeTokens = async () => {
    try {
        console.log("📊 Analyzing tokens in database...\n");

        // Get sample of tokens from database
        const tokens = await DB.query(`
            SELECT 
                arn as token,
                id,
                phone_number
            FROM Parent 
            WHERE arn IS NOT NULL 
            AND arn != ''
            LIMIT 20
        `);

        if (!tokens || tokens.length === 0) {
            console.log("❌ No tokens found in database");
            return;
        }

        console.log(`Found ${tokens.length} tokens to analyze:\n`);

        const stats = {
            total: tokens.length,
            ios: 0,
            android: 0,
            unknown: 0,
            invalid: 0
        };

        tokens.forEach((row: any, index: number) => {
            const token = row.token;
            const result = detectTokenType(token);

            // Update stats
            if (!result.isValid) {
                stats.invalid++;
            } else if (result.platform.includes('iOS')) {
                stats.ios++;
            } else if (result.platform.includes('Android')) {
                stats.android++;
            } else {
                stats.unknown++;
            }

            console.log(`Token ${index + 1}:`);
            console.log(`  ID: ${row.id}`);
            console.log(`  Phone: ${row.phone_number}`);
            console.log(`  Token: ${token.substring(0, 30)}...`);
            console.log(`  Length: ${token.length} chars`);
            console.log(`  Platform: ${result.platform}`);
            console.log(`  Channel: ${result.channelType}`);
            console.log(`  Valid: ${result.isValid ? '✅' : '❌'}`);
            console.log('---\n');
        });

        // Print summary
        console.log("📈 SUMMARY:");
        console.log(`Total Tokens: ${stats.total}`);
        console.log(`iOS (APNS): ${stats.ios} (${((stats.ios / stats.total) * 100).toFixed(1)}%)`);
        console.log(`Android (FCM): ${stats.android} (${((stats.android / stats.total) * 100).toFixed(1)}%)`);
        console.log(`Unknown: ${stats.unknown} (${((stats.unknown / stats.total) * 100).toFixed(1)}%)`);
        console.log(`Invalid: ${stats.invalid} (${((stats.invalid / stats.total) * 100).toFixed(1)}%)`);

        // Show token length distribution
        console.log("\n📏 TOKEN LENGTH DISTRIBUTION:");
        const lengthGroups: { [key: string]: number } = {};

        tokens.forEach((row: any) => {
            const length = row.token.length;
            const group = length < 64 ? '<64' :
                length === 64 ? '64' :
                    length < 100 ? '65-99' :
                        length < 150 ? '100-149' :
                            length < 200 ? '150-199' : '200+';

            lengthGroups[group] = (lengthGroups[group] || 0) + 1;
        });

        Object.entries(lengthGroups).forEach(([group, count]) => {
            console.log(`  ${group} chars: ${count} tokens`);
        });

    } catch (error) {
        console.error("❌ Error analyzing tokens:", error);
    } finally {
        await DB.closeConnection();
    }
};

// Run the analysis
analyzeTokens().then(() => {
    console.log("\n✅ Analysis complete!");
    process.exit(0);
}).catch((error) => {
    console.error("❌ Failed to analyze tokens:", error);
    process.exit(1);
});