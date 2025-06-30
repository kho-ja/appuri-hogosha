# Push Notification Service - Refactored

This is the refactored version of the push notification service, broken down into modular, maintainable components.

## 📁 Project Structure

```
push-notification/
├── src/
│   ├── config/                    # Configuration management
│   │   ├── aws.ts                 # AWS client configuration
│   │   ├── environment.ts         # Environment variables
│   │   └── rate-limits.ts         # Rate limiting configuration
│   │
│   ├── services/                  # Business logic services
│   │   ├── aws/
│   │   │   ├── pinpoint.ts        # AWS Pinpoint push notifications
│   │   │   ├── sms.ts             # AWS SMS service
│   │   │   └── kms.ts             # KMS encryption/decryption
│   │   ├── playmobile/
│   │   │   ├── api.ts             # PlayMobile SMS API
│   │   │   └── credentials.ts     # Credential verification
│   │   ├── telegram/
│   │   │   └── bot.ts             # Telegram bot service
│   │   └── database/
│   │       ├── client.ts          # Database connection
│   │       └── queries.ts         # Database queries
│   │
│   ├── handlers/                  # Event handlers
│   │   ├── cognito/
│   │   │   └── sms-handler.ts     # Cognito SMS triggers
│   │   ├── api/
│   │   │   └── sms-api.ts         # API Gateway handlers
│   │   └── notifications/
│   │       └── push-notifications.ts # Notification processing
│   │
│   ├── utils/                     # Utility functions
│   │   ├── token-detection.ts     # Push token analysis
│   │   ├── localization.ts        # Multi-language support
│   │   ├── validation.ts          # Phone number validation
│   │   ├── event-detection.ts     # Event source detection
│   │   └── diagnostics.ts         # SMS diagnostics
│   │
│   ├── types/                     # TypeScript definitions
│   │   ├── events.ts              # Event type definitions
│   │   ├── responses.ts           # Response type definitions
│   │   └── notifications.ts       # Notification types
│   │
│   ├── index.ts                   # Main entry point
│   ├── debug-push-notifications.ts # Debug utilities
│   └── analyze-db-tokens.ts       # Token analysis tool
│
├── package.json
├── tsconfig.json
├── nodemon.json
└── README.md
```

## 🔧 Key Improvements

### 1. **Separation of Concerns**
- Each service has its own module with clear responsibilities
- Configuration is centralized and environment-aware
- Business logic is separated from infrastructure concerns

### 2. **Type Safety**
- Comprehensive TypeScript definitions
- Proper interfaces for all data structures
- Better IDE support and error catching

### 3. **Maintainability**
- Smaller, focused files (each under 200 lines)
- Clear module boundaries
- Easy to locate and modify specific functionality

### 4. **Testability**
- Services can be easily mocked and tested in isolation
- Dependency injection patterns
- Clear input/output contracts

### 5. **Scalability**
- Easy to add new notification channels
- Simple to extend with new features
- Better error handling and monitoring

## 🚀 Usage

### Development
```bash
npm run dev          # Start with nodemon
npm run build        # Compile TypeScript
npm run type-check   # Check types without building
```

### Debugging
```bash
npm run debug-push   # Debug push notifications
npm run analyze-db   # Analyze database tokens
```

### Deployment
```bash
npm run deploy       # Build and prepare for deployment
```

## 🔌 Service Integration

### AWS Services
- **Pinpoint**: Push notifications for iOS/Android
- **SMS Voice V2**: SMS delivery for international numbers
- **KMS**: Encryption/decryption for Cognito

### Third-party Services
- **PlayMobile**: Local SMS delivery for Uzbekistan
- **Telegram**: Bot notifications

### Database
- **MySQL**: Notification queue and user data

## 📱 Supported Features

### Push Notifications
- iOS APNS tokens (device tokens)
- Android FCM tokens
- Automatic platform detection
- Rich notification payloads

### SMS Routing
- **Uzbekistan operators**:
  - Beeline (90, 99) → PlayMobile
  - UMS (95) → PlayMobile  
  - Mobiuz (97, 98) → PlayMobile
  - Ucell (91, 93, 94) → AWS SMS (bypass)
- **International** → AWS SMS

### Multi-language Support
- Japanese (jp)
- Russian (ru)
- Uzbek (uz)

## 🛡️ Error Handling & Diagnostics

### Rate Limiting
- Configurable daily/hourly limits
- Cost protection for SMS
- Character limit validation

### Monitoring
- Message status tracking
- Delivery diagnostics
- Performance metrics

### Fallback Strategies
- PlayMobile → AWS SMS fallback
- Retry mechanisms with exponential backoff
- Graceful degradation

## 🔧 Configuration

All configuration is managed through environment variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
PINPOINT_APP_ID=your-app-id
KMS_KEY_ID=your-kms-key

# PlayMobile Configuration  
BROKER_URL=https://api.playmobile.uz
BROKER_AUTH=username:password

# Database Configuration
HOST=localhost
DB_PORT=3306
USER=username
PASSWORD=password
DATABASE=database_name

# Telegram Configuration
BOT_TOKEN=your-telegram-bot-token
```

## 📋 Migration Notes

This refactored version maintains full backward compatibility with the original API while providing:

- Better code organization
- Improved error handling
- Enhanced debugging capabilities
- Easier testing and maintenance
- Clearer separation of concerns

The main entry point (`src/index.ts`) orchestrates all services and maintains the same Lambda handler interface.