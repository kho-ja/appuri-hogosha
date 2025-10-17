cleanup-orphan-cognito

Find and optionally delete Cognito users that were created by a bad CSV upload but never inserted into the DB ("orphans").

Requirements

- Environment variables for DB and AWS Cognito (ACCESS_KEY, SECRET_ACCESS_KEY, SERVICE_REGION, PARENT_POOL_ID, PARENT_CLIENT_ID, DB creds, etc.) must be available in your shell.
- The script uses the project's DB client and Cognito `Parent` client.

CSV input format

- Headered CSV with one of these columns is supported: `phone_number`, `phone`, `phoneNumber`.
- Or a plain newline-separated list of phone numbers.
- Phone numbers are normalized (spaces removed, leading `+` stripped) before lookup.

Usage (recommended via npm script)

- From repo root (Windows PowerShell):

```pwsh
# Dry run (lists orphans only)
npm run -w backend cleanup-orphans -- --csv "C:\Users\you\phones.csv"

# Delete mode (this will delete the found Cognito users)
npm run -w backend cleanup-orphans -- --csv "C:\Users\you\phones.csv" --confirm
```

- Or from the backend folder:

```pwsh
# Dry run
cd backend
npm run cleanup-orphans -- --csv "C:\Users\you\phones.csv"

# Delete
npm run cleanup-orphans -- --csv "C:\Users\you\phones.csv" --confirm
```

Alternative direct run (optional)

```pwsh
# Using tsx directly from repo root
npx tsx backend/scripts/cleanup-orphan-cognito.ts --csv "C:\Users\you\phones.csv"
npx tsx backend/scripts/cleanup-orphan-cognito.ts --csv "C:\Users\you\phones.csv" --confirm
```

What it does

1. Reads phone numbers from the provided file and normalizes them.
2. Checks the DB for a Parent row with that phone_number.
3. If none exists, checks Cognito for a user with Username = "+{phone}".
4. Dry run prints the list of orphans. With `--confirm`, it deletes those Cognito users.

Safety and tips

- Always run a dry run first to review what will be deleted.
- Deletions are irreversible. Ensure you have the correct file and environment.

Troubleshooting

- If you get AWS/Cognito errors, verify your AWS credentials, region, and user pool variables are set.
- If no phone numbers are detected, confirm the CSV header name or try a plain newline list.
- If DB connection fails, confirm DB env vars and network access.

Common error: "Region is missing"

- Ensure `SERVICE_REGION` is set in `backend/.env` (e.g., `ap-northeast-1`).
- Run the script via npm so dotenv loads automatically:

```pwsh
npm run -w backend cleanup-orphans -- --csv "C:\path\to\phones.csv"
```

- If running from another working directory, the script now loads `backend/.env` via dotenv, but running from the repo root or `backend` folder is recommended.
