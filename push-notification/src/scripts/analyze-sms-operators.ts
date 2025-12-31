import { config } from 'dotenv';
import DatabaseClient from '../db-client';
import { getUzbekistanOperatorRouting } from '../utils/validation';

config();

const DB = new DatabaseClient();

interface OperatorStats {
    name: string;
    count: number;
    usePlayMobile: boolean;
    percentage: number;
    codes: string[];
}

const analyzeOperators = async () => {
    try {
        console.log('📊 Analyzing SMS operator distribution in database...\n');

        // Fetch all phone numbers from Parent table
        const parents = await DB.query(`
            SELECT 
                id,
                phone_number
            FROM Parent 
            WHERE phone_number IS NOT NULL 
            AND phone_number != ''
        `);

        if (!parents || parents.length === 0) {
            console.log('❌ No phone numbers found in database');
            return;
        }

        console.log(
            `Found ${parents.length} parent records with phone numbers\n`
        );

        // Operator code to names mapping
        const operatorCodeMap: Record<string, string[]> = {
            OQ: ['20'],
            Humans: ['33'],
            Ucell: ['55', '93', '94'],
            UzMobile: ['77'],
            Mobiuz: ['88', '97', '98'],
            Beeline: ['90', '91', '99'],
            UMS: ['95'],
        };

        // Statistics collection
        const stats: Record<string, OperatorStats> = {};
        let uzbekistanCount = 0;
        let internationalCount = 0;
        let invalidCount = 0;

        // Analyze each phone number
        parents.forEach((parent: any) => {
            const routing = getUzbekistanOperatorRouting(parent.phone_number);

            if (!routing.isUzbekistan) {
                internationalCount++;
                return;
            }

            if (routing.operator === 'Unknown') {
                invalidCount++;
                return;
            }

            uzbekistanCount++;

            if (!stats[routing.operator]) {
                // Find operator codes
                let codes: string[] = [];
                for (const [operator, opCodes] of Object.entries(
                    operatorCodeMap
                )) {
                    if (operator === routing.operator) {
                        codes = opCodes;
                        break;
                    }
                }

                stats[routing.operator] = {
                    name: routing.operator,
                    count: 0,
                    usePlayMobile: routing.usePlayMobile,
                    percentage: 0,
                    codes: codes,
                };
            }

            stats[routing.operator].count++;
        });

        // Calculate percentages
        Object.values(stats).forEach(op => {
            op.percentage = (op.count / uzbekistanCount) * 100;
        });

        // Sort by count descending
        const sortedOperators = Object.values(stats).sort(
            (a, b) => b.count - a.count
        );

        // Print detailed breakdown
        console.log('📈 OPERATOR DISTRIBUTION:');
        console.log('═'.repeat(80));

        sortedOperators.forEach(op => {
            const provider = op.usePlayMobile ? '🟢 PlayMobile' : '🔵 AWS SMS';
            console.log(
                `\n${op.name.padEnd(15)} │ ${op.count.toString().padStart(4)} users │ ${op.percentage.toFixed(1).padStart(5)}% │ ${provider}`
            );
            console.log(
                `  Codes: ${op.codes.join(', ').padEnd(30)} │ Operator prefix: +998${op.codes[0]}`
            );
        });

        // Print summary
        console.log('\n' + '═'.repeat(80));
        console.log('\n📊 SUMMARY STATISTICS:');
        console.log(`  Total phone numbers: ${parents.length}`);
        console.log(
            `  ✅ Uzbekistan numbers: ${uzbekistanCount} (${((uzbekistanCount / parents.length) * 100).toFixed(1)}%)`
        );
        console.log(
            `  🌍 International numbers: ${internationalCount} (${((internationalCount / parents.length) * 100).toFixed(1)}%)`
        );
        console.log(
            `  ❌ Invalid/Unknown: ${invalidCount} (${((invalidCount / parents.length) * 100).toFixed(1)}%)`
        );

        // SMS Provider breakdown
        const playMobileCount = sortedOperators
            .filter(op => op.usePlayMobile)
            .reduce((sum, op) => sum + op.count, 0);
        const awsCount = uzbekistanCount - playMobileCount;

        console.log('\n💰 SMS PROVIDER ROUTING:');
        console.log(
            `  🟢 PlayMobile: ${playMobileCount} users (${((playMobileCount / uzbekistanCount) * 100).toFixed(1)}%)`
        );
        console.log(
            `  🔵 AWS SMS: ${awsCount} users (${((awsCount / uzbekistanCount) * 100).toFixed(1)}%)`
        );

        // Rate limit capacity analysis
        const DAILY_LIMIT = 1000;
        const HOURLY_LIMIT = 100;

        console.log('\n⚡ RATE LIMIT CAPACITY:');
        console.log(
            `  Daily limit: ${DAILY_LIMIT} SMS/day (${((DAILY_LIMIT / uzbekistanCount) * 100).toFixed(2)} per user)`
        );
        console.log(
            `  Hourly limit: ${HOURLY_LIMIT} SMS/hour (${((HOURLY_LIMIT / uzbekistanCount) * 100).toFixed(2)} per user)`
        );

        if (uzbekistanCount > 0) {
            const usersPerDay = Math.floor(DAILY_LIMIT / uzbekistanCount);
            const usersPerHour = Math.floor(HOURLY_LIMIT / uzbekistanCount);
            console.log(
                `  Max daily SMS per user: ${usersPerDay} (before exceeding limit)`
            );
            console.log(
                `  Max hourly SMS per user: ${usersPerHour} (before exceeding limit)`
            );

            if (uzbekistanCount > DAILY_LIMIT) {
                console.log(
                    `\n  ⚠️  WARNING: ${uzbekistanCount} users exceeds daily limit of ${DAILY_LIMIT}!`
                );
                console.log(
                    `     Cannot send individual SMS to all users in one day.`
                );
                console.log(
                    `     Recommendation: Implement batching or upgrade SMS plan.`
                );
            }
        }

        // Sample phone numbers from each operator
        console.log('\n📱 SAMPLE PHONE NUMBERS (by operator):');
        console.log('═'.repeat(80));

        const samplesByOperator: Record<string, string[]> = {};

        parents.forEach((parent: any) => {
            const routing = getUzbekistanOperatorRouting(parent.phone_number);
            if (routing.isUzbekistan && routing.operator !== 'Unknown') {
                if (!samplesByOperator[routing.operator]) {
                    samplesByOperator[routing.operator] = [];
                }
                if (samplesByOperator[routing.operator].length < 3) {
                    samplesByOperator[routing.operator].push(
                        parent.phone_number
                    );
                }
            }
        });

        Object.entries(samplesByOperator).forEach(([operator, samples]) => {
            console.log(`\n${operator}:`);
            samples.forEach(phone => {
                console.log(`  • ${phone}`);
            });
        });

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('═'.repeat(80));

        if (playMobileCount === 0) {
            console.log(
                '  ℹ️  All Uzbekistan users are using AWS SMS (Ucell operators).'
            );
        } else if (awsCount === 0) {
            console.log('  ℹ️  All Uzbekistan users support PlayMobile.');
        } else {
            console.log('  ℹ️  Mixed operator distribution detected.');
            console.log(
                '     Using combined routing (PlayMobile + AWS) is optimal.'
            );
        }

        if (uzbekistanCount > DAILY_LIMIT) {
            console.log(
                `  ⚠️  Consider upgrading SMS plan (current limit: ${DAILY_LIMIT}/day)`
            );
        }

        console.log('\n✅ Analysis complete!');
    } catch (error) {
        console.error('❌ Error analyzing operators:', error);
    } finally {
        await DB.closeConnection();
    }
};

// Run the analysis
analyzeOperators()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Failed to analyze operators:', error);
        process.exit(1);
    });
