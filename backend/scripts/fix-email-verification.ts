import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  AdminUpdateUserAttributesCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import DB from "../src/utils/db-client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface Admin {
  email: string;
  phone_number: string;
  given_name: string;
  family_name: string;
}

const client = new CognitoIdentityProviderClient({
  region: process.env.SERVICE_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY ?? "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
  },
});

const ADMIN_POOL_ID = process.env.ADMIN_POOL_ID ?? "";

async function fixExistingAdmins(): Promise<void> {
  console.log("🔧 Fixing email verification for existing admin users...\n");

  try {
    // Get all admins from database
    const admins: Admin[] = await DB.query(`
            SELECT email, phone_number, given_name, family_name 
            FROM Admin 
            ORDER BY id
        `);

    console.log(`Found ${admins.length} admins in database\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const admin of admins) {
      console.log(`\n👤 Processing: ${admin.given_name} ${admin.family_name}`);
      console.log(`   Email: ${admin.email}`);

      try {
        // First check if user exists and get current status
        const getUserParams: AdminGetUserCommandInput = {
          UserPoolId: ADMIN_POOL_ID,
          Username: admin.email,
        };

        const getUserCommand = new AdminGetUserCommand(getUserParams);
        const userResult = await client.send(getUserCommand);

        const emailVerifiedAttr = userResult.UserAttributes?.find(
          (attr) => attr.Name === "email_verified"
        );

        const isEmailVerified = emailVerifiedAttr?.Value === "true";

        if (isEmailVerified) {
          console.log(`   ✅ Email already verified`);
          successCount++;
          continue;
        }

        console.log(`   🔧 Verifying email address...`);

        // Update email verification status
        const updateParams: AdminUpdateUserAttributesCommandInput = {
          UserPoolId: ADMIN_POOL_ID,
          Username: admin.email,
          UserAttributes: [
            {
              Name: "email_verified",
              Value: "true",
            },
          ],
        };

        const updateCommand = new AdminUpdateUserAttributesCommand(
          updateParams
        );
        await client.send(updateCommand);
        console.log(`   ✅ Email address verified successfully!`);
        successCount++;
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.name} - ${error.message}`);
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n" + "=".repeat(50));
    console.log("🏁 SUMMARY:");
    console.log(`✅ Successfully verified: ${successCount} admins`);
    console.log(`❌ Errors: ${errorCount} admins`);
    console.log("=".repeat(50));

    if (successCount > 0) {
      console.log(
        "\n🎉 Great! Now try the admin forgot password functionality again."
      );
    }
  } catch (error: any) {
    console.error("❌ Script error:", error);
  } finally {
    // Close DB connection if needed
    process.exit(0);
  }
}

// Function to verify a single admin email
async function verifySingleAdmin(email: string): Promise<void> {
  console.log(`🔧 Verifying single admin: ${email}`);

  try {
    const updateParams: AdminUpdateUserAttributesCommandInput = {
      UserPoolId: ADMIN_POOL_ID,
      Username: email,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
    };

    const updateCommand = new AdminUpdateUserAttributesCommand(updateParams);
    await client.send(updateCommand);
    console.log(`✅ Email address verified successfully!`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.name} - ${error.message}`);
  }
}

// Function to check verification status of an admin
async function checkAdminStatus(email: string): Promise<void> {
  console.log(`🔍 Checking admin status: ${email}`);

  try {
    const getUserParams: AdminGetUserCommandInput = {
      UserPoolId: ADMIN_POOL_ID,
      Username: email,
    };

    const getUserCommand = new AdminGetUserCommand(getUserParams);
    const userResult = await client.send(getUserCommand);

    console.log(`   User Status: ${userResult.UserStatus}`);
    console.log(`   Enabled: ${userResult.Enabled}`);

    // Check all attributes
    const emailAttr = userResult.UserAttributes?.find(
      (attr) => attr.Name === "email"
    );
    const emailVerifiedAttr = userResult.UserAttributes?.find(
      (attr) => attr.Name === "email_verified"
    );
    const phoneAttr = userResult.UserAttributes?.find(
      (attr) => attr.Name === "phone_number"
    );
    const phoneVerifiedAttr = userResult.UserAttributes?.find(
      (attr) => attr.Name === "phone_number_verified"
    );

    console.log(`   Email: ${emailAttr?.Value || "Not set"}`);
    console.log(`   Email Verified: ${emailVerifiedAttr?.Value || "false"}`);
    console.log(`   Phone: ${phoneAttr?.Value || "Not set"}`);
    console.log(`   Phone Verified: ${phoneVerifiedAttr?.Value || "false"}`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.name} - ${error.message}`);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

switch (command) {
  case "fix-all":
    fixExistingAdmins();
    break;
  case "verify-single":
    if (!email) {
      console.log(
        "❌ Please provide an email address: npm run fix-email verify-single admin@example.com"
      );
      process.exit(1);
    }
    verifySingleAdmin(email);
    break;
  case "check-status":
    if (!email) {
      console.log(
        "❌ Please provide an email address: npm run fix-email check-status admin@example.com"
      );
      process.exit(1);
    }
    checkAdminStatus(email);
    break;
  default:
    console.log("Available commands:");
    console.log("  fix-all          - Fix all admin users in database");
    console.log("  verify-single    - Verify single admin email");
    console.log("  check-status     - Check admin verification status");
    console.log("");
    console.log("Examples:");
    console.log("  npm run fix-email fix-all");
    console.log("  npm run fix-email verify-single admin@example.com");
    console.log("  npm run fix-email check-status admin@example.com");
    break;
}
