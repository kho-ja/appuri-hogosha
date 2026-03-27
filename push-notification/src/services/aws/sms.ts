import {
    PinpointSMSVoiceV2Client,
    SendTextMessageCommand,
    SendTextMessageCommandInput,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { getAwsConfig } from '../../config/aws';
import { ENVIRONMENT } from '../../config/environment';

export class AwsSmsService {
    private smsClient: PinpointSMSVoiceV2Client;

    constructor() {
        this.smsClient = new PinpointSMSVoiceV2Client(getAwsConfig());
    }

    private isMissingSenderIdError(error: unknown): boolean {
        const err = error as {
            name?: string;
            ResourceType?: string;
            message?: string;
        };

        return (
            err?.name === 'ResourceNotFoundException' &&
            (err?.ResourceType === 'sender-id' ||
                err?.message?.includes('ResourceType="sender-id"') === true)
        );
    }

    private async sendWithPayload(
        payload: SendTextMessageCommandInput
    ): Promise<boolean> {
        const result = await this.smsClient.send(
            new SendTextMessageCommand(payload)
        );

        if (result.MessageId) {
            console.log(
                `✅ AWS SMS sent successfully to ${payload.DestinationPhoneNumber}. MessageId: ${result.MessageId}`
            );
            return true;
        }

        console.log(
            `❌ AWS SMS failed for ${payload.DestinationPhoneNumber} (no MessageId returned)`
        );
        return false;
    }

    async sendSms(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // Format phone number (ensure it starts with +)
            let formattedPhoneNumber = phoneNumber;
            if (!formattedPhoneNumber.startsWith('+')) {
                formattedPhoneNumber = `+${formattedPhoneNumber}`;
            }

            const payload: SendTextMessageCommandInput = {
                DestinationPhoneNumber: formattedPhoneNumber,
                MessageBody: message,
                ConfigurationSetName: ENVIRONMENT.SMS_CONFIGURATION_SET_NAME,
            };

            if (ENVIRONMENT.SMS_ORIGINATION_IDENTITY) {
                payload.OriginationIdentity =
                    ENVIRONMENT.SMS_ORIGINATION_IDENTITY;
            }

            try {
                return await this.sendWithPayload(payload);
            } catch (error) {
                if (
                    payload.OriginationIdentity &&
                    this.isMissingSenderIdError(error)
                ) {
                    console.warn(
                        `⚠️ Sender ID '${payload.OriginationIdentity}' not found. Retrying without OriginationIdentity for ${formattedPhoneNumber}.`
                    );

                    const fallbackPayload: SendTextMessageCommandInput = {
                        ...payload,
                    };
                    delete fallbackPayload.OriginationIdentity;

                    return await this.sendWithPayload(fallbackPayload);
                }

                throw error;
            }
        } catch (error) {
            console.error(`❌ Error sending AWS SMS to ${phoneNumber}:`, error);
            return false;
        }
    }
}
