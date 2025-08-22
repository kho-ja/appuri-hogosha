import {
    CognitoIdentityProviderClient,
    AdminUpdateUserAttributesCommand,
    AdminGetUserCommand,
    AdminGetUserCommandInput,
    AdminUpdateUserAttributesCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import DB from '../src/utils/db-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Parent {
    phone_number: string;
    email: string;
    given_name: string;
    family_name: string;
}

const client = new CognitoIdentityProviderClient({
    region: process.env.SERVICE_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY ?? '',
        secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
    },
});

const PARENT_POOL_ID = process.env.PARENT_POOL_ID ?? '';

async function fixExistingUsers(): Promise<void> {
    console.log('🔧 Fixing phone verification for existing users...\n');

    try {
        // Get all parents from database
        const parents: Parent[] = await DB.query(`
            SELECT phone_number, email, given_name, family_name 
            FROM Parent 
            ORDER BY id
        `);

        console.log(`Found ${parents.length} parents in database\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const parent of parents) {
            const phoneWithPlus = parent.phone_number.startsWith('+')
                ? parent.phone_number
                : `+${parent.phone_number}`;

            console.log(
                `\n👤 Processing: ${parent.given_name} ${parent.family_name}`
            );
            console.log(`   Phone: ${phoneWithPlus}`);

            try {
                // First check if user exists and get current status
                const getUserParams: AdminGetUserCommandInput = {
                    UserPoolId: PARENT_POOL_ID,
                    Username: phoneWithPlus,
                };

                const getUserCommand = new AdminGetUserCommand(getUserParams);
                const userResult = await client.send(getUserCommand);

                const phoneVerifiedAttr = userResult.UserAttributes?.find(
                    attr => attr.Name === 'phone_number_verified'
                );

                const isPhoneVerified = phoneVerifiedAttr?.Value === 'true';

                if (isPhoneVerified) {
                    console.log(`   ✅ Phone already verified`);
                    successCount++;
                    continue;
                }

                console.log(`   🔧 Verifying phone number...`);

                // Update phone verification status
                const updateParams: AdminUpdateUserAttributesCommandInput = {
                    UserPoolId: PARENT_POOL_ID,
                    Username: phoneWithPlus,
                    UserAttributes: [
                        {
                            Name: 'phone_number_verified',
                            Value: 'true',
                        },
                    ],
                };

                const updateCommand = new AdminUpdateUserAttributesCommand(
                    updateParams
                );
                await client.send(updateCommand);
                console.log(`   ✅ Phone number verified successfully!`);
                successCount++;
            } catch (error: any) {
                console.log(`   ❌ Error: ${error.name} - ${error.message}`);
                errorCount++;
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n' + '='.repeat(50));
        console.log('🏁 SUMMARY:');
        console.log(`✅ Successfully verified: ${successCount} users`);
        console.log(`❌ Errors: ${errorCount} users`);
        console.log('='.repeat(50));

        if (successCount > 0) {
            console.log(
                '\n🎉 Great! Now try the forgot password functionality again.'
            );
        }
    } catch (error: any) {
        console.error('❌ Script error:', error);
    } finally {
        // Close DB connection if needed
        process.exit(0);
    }
}

// Also create a function to verify a single user
async function verifySingleUser(phoneNumber: string): Promise<void> {
    const phoneWithPlus = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+${phoneNumber}`;

    console.log(`🔧 Verifying single user: ${phoneWithPlus}`);

    try {
        const updateParams: AdminUpdateUserAttributesCommandInput = {
            UserPoolId: PARENT_POOL_ID,
            Username: phoneWithPlus,
            UserAttributes: [
                {
                    Name: 'phone_number_verified',
                    Value: 'true',
                },
            ],
        };

        const updateCommand = new AdminUpdateUserAttributesCommand(
            updateParams
        );
        await client.send(updateCommand);
        console.log(`✅ Phone number verified successfully!`);
    } catch (error: any) {
        console.log(`❌ Error: ${error.name} - ${error.message}`);
    }
}

// Function to check verification status of a user
async function checkUserStatus(phoneNumber: string): Promise<void> {
    const phoneWithPlus = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+${phoneNumber}`;

    console.log(`🔍 Checking user status: ${phoneWithPlus}`);

    try {
        const getUserParams: AdminGetUserCommandInput = {
            UserPoolId: PARENT_POOL_ID,
            Username: phoneWithPlus,
        };

        const getUserCommand = new AdminGetUserCommand(getUserParams);
        const userResult = await client.send(getUserCommand);

        console.log(`   User Status: ${userResult.UserStatus}`);
        console.log(`   Enabled: ${userResult.Enabled}`);

        // Check all attributes
        const phoneAttr = userResult.UserAttributes?.find(
            attr => attr.Name === 'phone_number'
        );
        const phoneVerifiedAttr = userResult.UserAttributes?.find(
            attr => attr.Name === 'phone_number_verified'
        );
        const emailAttr = userResult.UserAttributes?.find(
            attr => attr.Name === 'email'
        );
        const emailVerifiedAttr = userResult.UserAttributes?.find(
            attr => attr.Name === 'email_verified'
        );

        console.log(`   Phone: ${phoneAttr?.Value || 'Not set'}`);
        console.log(
            `   Phone Verified: ${phoneVerifiedAttr?.Value || 'false'}`
        );
        console.log(`   Email: ${emailAttr?.Value || 'Not set'}`);
        console.log(
            `   Email Verified: ${emailVerifiedAttr?.Value || 'false'}`
        );
    } catch (error: any) {
        console.log(`❌ Error: ${error.name} - ${error.message}`);
    }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const phoneNumber = args[1];

switch (command) {
    case 'fix-all':
        fixExistingUsers();
        break;
    case 'verify-single':
        if (!phoneNumber) {
            console.log(
                '❌ Please provide a phone number: npm run fix-phone verify-single +998935108199'
            );
            process.exit(1);
        }
        verifySingleUser(phoneNumber);
        break;
    case 'check-status':
        if (!phoneNumber) {
            console.log(
                '❌ Please provide a phone number: npm run fix-phone check-status +998935108199'
            );
            process.exit(1);
        }
        checkUserStatus(phoneNumber);
        break;
    default:
        console.log('Available commands:');
        console.log('  fix-all          - Fix all users in database');
        console.log('  verify-single    - Verify single user phone');
        console.log('  check-status     - Check user verification status');
        console.log('');
        console.log('Examples:');
        console.log('  npm run fix-phone fix-all');
        console.log('  npm run fix-phone verify-single +998935108199');
        console.log('  npm run fix-phone check-status +998935108199');
        break;
}
