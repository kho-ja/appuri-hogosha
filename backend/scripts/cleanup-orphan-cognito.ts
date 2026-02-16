import fs from 'fs';
import path from 'path';
import { config } from '../src/config';
import csv from 'csv-parser';

// basic arg parsing
const args = process.argv.slice(2);
let csvPath = '';
let doConfirm = false;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
        csvPath = args[i + 1];
        i++;
    } else if (args[i] === '--confirm') {
        doConfirm = true;
    }
}

if (!csvPath) {
    console.error('Usage: --csv path/to/file.csv [--confirm]');
    process.exit(2);
}

function normalizePhone(s: string) {
    if (!s) return '';
    return s.replace(/\s+/g, '').replace(/^\+/, '');
}

async function main() {
    // Preflight validation for required env vars (helps avoid cryptic AWS errors)
    const missing: string[] = [];
    if (!config.SERVICE_REGION) missing.push('SERVICE_REGION');
    if (!config.ACCESS_KEY) missing.push('ACCESS_KEY');
    if (!config.SECRET_ACCESS_KEY) missing.push('SECRET_ACCESS_KEY');
    if (!config.PARENT_POOL_ID) missing.push('PARENT_POOL_ID');
    if (!config.PARENT_CLIENT_ID) missing.push('PARENT_CLIENT_ID');
    if (missing.length) {
        console.error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
                'Create or update your backend/.env file and ensure you run via npm so dotenv loads.'
        );
        process.exit(2);
    }

    const abs = path.isAbsolute(csvPath)
        ? csvPath
        : path.join(process.cwd(), csvPath);
    if (!fs.existsSync(abs)) {
        console.error('CSV not found at', abs);
        process.exit(2);
    }
    const content = fs.readFileSync(abs, 'utf8');

    let phones: string[] = [];
    const likelyCsv = content.includes(',');
    if (!likelyCsv) {
        // Treat as plain newline list
        phones = content
            .split(/\r?\n/)
            .map(s => normalizePhone(s))
            .filter(Boolean);
    } else {
        // Parse as CSV with csv-parser (stream-based)
        const records: any[] = await new Promise((resolve, reject) => {
            const rows: any[] = [];
            fs.createReadStream(abs)
                .pipe(csv())
                .on('data', (data: any) => rows.push(data))
                .on('end', () => resolve(rows))
                .on('error', (err: any) => reject(err));
        });

        const colNames = ['phone_number', 'phone', 'phoneNumber'];
        for (const r of records) {
            let found = false;
            for (const c of colNames) {
                if (r[c]) {
                    phones.push(normalizePhone(String(r[c])));
                    found = true;
                    break;
                }
            }
            if (!found) {
                const vals = Object.values(r);
                if (vals.length === 1)
                    phones.push(normalizePhone(String(vals[0])));
            }
        }
    }

    phones = Array.from(new Set(phones)).filter(Boolean);
    if (phones.length === 0) {
        console.error('No phone numbers found in file.');
        process.exit(2);
    }

    console.log('Found', phones.length, 'unique phone numbers to check.');

    // Dynamically import DB and Cognito client AFTER env vars are loaded
    const DB = (await import('../src/utils/db-client')).default as any;
    const { Parent } = await import('../src/utils/cognito-client');

    const orphans: {
        phone: string;
        cognitoUsername?: string;
        cognitoPresent: boolean;
    }[] = [];

    for (const phone of phones) {
        // lookup DB by phone number stored without +
        const dbRes = await DB.query(
            'SELECT id FROM Parent WHERE phone_number = :phone',
            { phone }
        );
        if (dbRes && dbRes.length > 0) continue; // parent exists in DB

        // query Cognito for user by phone: Cognito Username is usually the phone number with + prefix
        const username = `+${phone}`;
        try {
            // Use AdminGetUser by using Parent (Cognito client) via its internal methods is not exposed, but delete/get operations exist.
            // We will attempt to call Parent.checkUserVerificationStatus which uses AdminGetUser; but that method returns verification state, not full user.
            // Instead, call Parent.isFirstTimeLogin which uses AdminGetUser; if it returns, the user exists. This is a light-weight existence check.
            const exists = await Parent.checkUserVerificationStatus(username)
                .then(() => true)
                .catch(() => false);
            orphans.push({
                phone,
                cognitoUsername: username,
                cognitoPresent: exists,
            });
        } catch {
            orphans.push({
                phone,
                cognitoUsername: username,
                cognitoPresent: false,
            });
        }
    }

    const toDelete = orphans.filter(o => o.cognitoPresent === true);

    console.log('\nOrphan Cognito users (present in Cognito but not in DB):');
    toDelete.forEach(o => console.log(o.cognitoUsername));

    if (toDelete.length === 0) {
        console.log('No orphan Cognito users found.');
        process.exit(0);
    }

    if (!doConfirm) {
        console.log(
            '\nRun with --confirm to actually delete these users from Cognito.'
        );
        process.exit(0);
    }

    console.log('\nDeleting', toDelete.length, 'Cognito users...');
    for (const o of toDelete) {
        try {
            await Parent.delete(o.cognitoUsername ?? `+${o.phone}`);
            console.log('Deleted', o.cognitoUsername);
        } catch (e: any) {
            console.error(
                'Failed to delete',
                o.cognitoUsername,
                e.message || e
            );
        }
    }

    console.log('Done.');
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal error', e?.message || e);
    process.exit(1);
});
