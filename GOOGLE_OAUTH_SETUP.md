# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for the admin panel using AWS Cognito as an intermediary.

## Architecture Overview

The Google OAuth integration uses the following flow:

1. User clicks "Login with Google" in the frontend
2. Frontend redirects to backend OAuth endpoint (`/google`)
3. Backend redirects to Cognito Hosted UI with Google identity provider
4. User authenticates with Google via Cognito
5. Cognito redirects to backend callback (`/google/callback`)
6. Backend validates user, exchanges tokens, and redirects to frontend
7. Frontend processes OAuth callback and signs in user via NextAuth

## AWS Cognito Configuration

### 1. Set up Google as Identity Provider in Cognito

1. Go to AWS Cognito Console
2. Select your User Pool
3. Navigate to "Authentication" > "Social and external providers"
4. Click "Add identity provider" (or "New")
5. Select "Google"
6. Configure the following:
   - **Client ID**: Your Google OAuth client ID
   - **Client secret**: Your Google OAuth client secret
   - **Authorized scopes**: `profile email openid`
   - **Attribute mapping**: Map Google attributes to Cognito attributes:
     - `email` → `email`
     - `given_name` → `given_name`
     - `family_name` → `family_name`

### 2. Configure Hosted UI

1. In your User Pool, go to "App integration" > "App clients"
2. Select your admin app client
3. In your app client settings, enable OAuth 2.0 and configure Hosted UI options:
   - **Allowed callback URLs**: Add `http://localhost:5000/google/callback` (adjust for your backend URL)
   - **Allowed sign-out URLs**: Add your frontend URL
   - **Enabled identity providers**: Check "Google"
   - **OAuth 2.0 grant types**: Enable "Authorization code grant"
   - **OpenID Connect scopes**: Enable `email`, `openid`, `profile`
   - Save changes

### 3. Get Cognito Domain

1. In "App integration" > "Domain", set up a Cognito domain
2. Note the domain URL (e.g., `https://your-app-admin.auth.us-east-1.amazoncognito.com`)

## Google Cloud Console Setup

### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Configure:
   - **Name**: Your app name
   - **Authorized JavaScript origins**: Your Cognito domain
   - **Authorized redirect URIs**: `https://your-cognito-domain/oauth2/idpresponse`
7. Note the Client ID and Client Secret

## Environment Configuration

### Backend (.env)

```bash
# Cognito OAuth Configuration
ADMIN_CLIENT_ID=your_admin_app_client_id
ADMIN_CLIENT_SECRET=your_admin_app_client_secret
COGNITO_DOMAIN=https://your-app-admin.auth.us-east-1.amazoncognito.com
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Existing AWS configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_CLIENT_ID=your_client_id
```

### Frontend (.env.local)

```bash
AUTH_SECRET="your_secret_key"
AUTH_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Database Requirements

Ensure your Admin table has the following columns for Google OAuth users:

- `email` (primary identifier)
- `given_name`
- `family_name`
- `last_login_at`

Admins must exist in the database with their Google email address before they can log in.

## Testing the Integration

1. Start your backend server: `npm run dev`
2. Start your frontend server: `npm run dev`
3. Navigate to the login page
4. Click "Login with Google"
5. You should be redirected through the OAuth flow

## Troubleshooting

### Common Issues

1. **"OAuth error" in frontend**

   - Check Cognito Hosted UI configuration
   - Verify Google identity provider setup
   - Check callback URL configuration

2. **"User not found" error**

   - Ensure the Google email exists in the Admin table
   - Check database connection and query

3. **Token exchange failed**

   - Verify `ADMIN_CLIENT_SECRET` is correct
   - Check Cognito app client configuration
   - Ensure OAuth scopes are properly configured

4. **Redirect URL mismatch**
   - Verify `BACKEND_URL` environment variable
   - Check Google Console redirect URI configuration
   - Ensure Cognito callback URLs match

### Debug Logging

The backend logs OAuth flow steps. Check console output for:

- Cognito redirect URL construction
- Token exchange responses
- User lookup results
- Callback processing

### Production Considerations

1. **Security**: The current implementation passes tokens via URL parameters for simplicity. In production, consider:

   - Using secure HTTP-only cookies
   - Implementing server-side sessions
   - Using a secure token exchange mechanism

2. **HTTPS**: Ensure all URLs use HTTPS in production
3. **Domain Configuration**: Update callback URLs for production domains
4. **Rate Limiting**: The OAuth endpoints have rate limiting applied
5. **Error Handling**: Implement proper error pages for OAuth failures

## API Endpoints

### Backend Endpoints

- `GET /google` - Initiates Google OAuth flow
- `GET /google/callback` - Handles OAuth callback from Cognito
- `GET /user-info` - Returns user information for given access token

### OAuth Flow Sequence

```
Frontend → /google → Cognito Hosted UI → Google → Cognito → /google/callback → Frontend
```

The backend acts as an OAuth proxy, handling all Cognito interactions while keeping the frontend decoupled from AWS services.
