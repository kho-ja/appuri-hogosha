# Appuri Hogosha

Appuri Hogosha is a notification platform for sending alerts to students' parents. It provides:

- A **web admin panel** for composing and sending notifications.
- A **mobile app** for parents to receive and read messages.
- **Optional social media bots** for extended notification delivery.

## Components

### Admin Panel

- **Frontend ([`admin-panel-frontend`](./admin-panel-frontend/README.md)):** Built with Next.js.

### Mobile App

- **Frontend (`mobile-frontend`):** Built with React Native.

### Backend

- **Backend ([`backend`](./backend/README.md)):** Built with Express.js.

### Notification Service

- **Push Notifications (`push-notification`):** Manages mobile notification delivery.

### Social Media Bots

- **Bots (`bots`):** Contains modules for social media notifications.

## AWS Cognito Custom Auth Setup

The mobile app uses **AWS Cognito Custom Authentication** for OTP-based login.

### Prerequisites
- AWS Account with Cognito User Pool
- Lambda function deployed (`push-notification`)
- AWS CLI or Console access

### Configuration Steps

#### 1. Enable CUSTOM_AUTH in App Client
1. Go to **AWS Console** → **Cognito** → **User Pools** → Select your pool
2. Navigate to **App integration** → **App clients**
3. Edit your app client
4. Under **Authentication flows**, enable:
   - ✅ `ALLOW_CUSTOM_AUTH`
   - ✅ `ALLOW_REFRESH_TOKEN_AUTH`
5. Save changes

#### 2. Configure Lambda Triggers
1. Go to **User pool properties** → **Lambda triggers**
2. Add the following triggers (all pointing to `push-notification` Lambda):
   - **Define auth challenge** → `push-notification`
   - **Create auth challenge** → `push-notification`
   - **Verify auth challenge response** → `push-notification`
3. Save changes

#### 3. Configure SMS Template (Optional)
1. Go to **Messaging** → **Message templates**
2. Find **SMS authentication message**
3. Set template using OTP-friendly format (use `{####}` for the code):
   ```
   {####} is your AppUri verification code.
   ```
   **Note:** This format is optimized for iOS/Android OTP auto-fill. The code should appear first for best results.
4. Save changes

### Environment Variables
Ensure these are set in your Lambda and backend:
```bash
COGNITO_USER_POOL_ID=your-pool-id
PARENT_POOL_ID=your-pool-id
PARENT_CLIENT_ID=your-app-client-id
```

### Testing
1. Open mobile app
2. Enter phone number → Click "Send Code"
3. Receive SMS with 6-digit OTP
4. Enter OTP → Auto-verify and login
