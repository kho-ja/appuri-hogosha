import { ChannelType } from '@aws-sdk/client-pinpoint';

export interface TokenAnalysis {
    channelType: ChannelType;
    isValid: boolean;
    platform: string;
    type?: string;
    format?: string;
    length?: number;
    issues?: string[];
}

export const detectTokenType = (token: string): TokenAnalysis => {
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

export const analyzeToken = (token: string): TokenAnalysis => {
    if (!token) {
        return {
            channelType: ChannelType.GCM,
            isValid: false,
            platform: 'unknown',
            issues: ['Token is empty']
        };
    }

    const issues: string[] = [];

    // iOS APNS token patterns
    const iosDeviceTokenPattern = /^[a-fA-F0-9]{64}$/; // 64 hex chars (legacy)
    const iosModernTokenPattern = /^[a-fA-F0-9]{64,}$/; // 64+ hex chars (modern)

    // FCM token patterns
    const fcmLegacyPattern = /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/; // Contains colon
    const fcmModernPattern = /^[A-Za-z0-9_-]{140,}$/; // Very long base64-like

    // Check token characteristics
    const hasColon = token.includes(':');
    const isHexOnly = /^[a-fA-F0-9]+$/.test(token);
    const length = token.length;

    if (iosDeviceTokenPattern.test(token)) {
        return {
            type: 'apns',
            platform: 'iOS',
            channelType: ChannelType.APNS,
            length: length,
            format: 'Device Token (64 hex)',
            isValid: true,
            issues: length !== 64 ? ['Unusual length for iOS token'] : []
        };
    } else if (iosModernTokenPattern.test(token) && isHexOnly) {
        return {
            type: 'apns',
            platform: 'iOS',
            channelType: ChannelType.APNS,
            length: length,
            format: 'Modern iOS Token',
            isValid: true,
            issues: length < 64 ? ['Token too short for iOS'] : []
        };
    } else if (fcmLegacyPattern.test(token) || hasColon) {
        return {
            type: 'fcm',
            platform: 'Android',
            channelType: ChannelType.GCM,
            length: length,
            format: 'FCM Token',
            isValid: true,
            issues: length < 100 ? ['Token seems too short for FCM'] : []
        };
    } else {
        issues.push('Unknown token format');
        issues.push(`Length: ${length} chars`);
        issues.push(`Has colon: ${hasColon}`);
        issues.push(`Is hex only: ${isHexOnly}`);

        return {
            type: 'unknown',
            platform: 'Unknown',
            channelType: ChannelType.GCM, // Default to GCM
            length: length,
            format: 'Unknown Format',
            isValid: false,
            issues: issues
        };
    }
};