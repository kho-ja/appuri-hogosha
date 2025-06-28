import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { getAwsConfig } from '../../config/aws';
import { ENVIRONMENT } from '../../config/environment';

export class AwsSmsService {
    private smsClient: PinpointSMSVoiceV2Client;

    constructor() {
        this.smsClient = new PinpointSMSVoiceV2Client(getAwsConfig());
    }

    async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // Format phone number (ensure it starts with +)
            let formattedPhoneNumber = phoneNumber;
            if (!formattedPhoneNumber.startsWith('+')) {
                formattedPhoneNumber = `+${formattedPhoneNumber}`;
            }

            const command = new SendTextMessageCommand({
                DestinationPhoneNumber: formattedPhoneNumber,
                MessageBody: message,
                OriginationIdentity: ENVIRONMENT.SMS_ORIGINATION_IDENTITY,
                ConfigurationSetName: ENVIRONMENT.SMS_CONFIGURATION_SET_NAME
            });

            const result = await this.smsClient.send(command);

            if (result.MessageId) {
                console.log(`✅ AWS SMS sent successfully to ${formattedPhoneNumber}. MessageId: ${result.MessageId}`);
                return true;
            } else {
                console.log(`❌ AWS SMS failed for ${formattedPhoneNumber}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error sending AWS SMS to ${phoneNumber}:`, error);
            return false;
        }
    }
}