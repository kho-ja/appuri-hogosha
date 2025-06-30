import { KmsKeyringNode, buildClient, CommitmentPolicy } from '@aws-crypto/client-node';
import { ENVIRONMENT } from '../../config/environment';

export class KmsDecryptionService {
    private decrypt: any;
    private keyring: KmsKeyringNode;

    constructor() {
        // Initialize AWS Encryption SDK client + keyring
        const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);
        this.decrypt = decrypt;
        this.keyring = new KmsKeyringNode({
            keyIds: [ENVIRONMENT.KMS_KEY_ARN || ENVIRONMENT.KMS_KEY_ID]
        });
    }

    async decryptCode(encryptedCode: string): Promise<string> {
        try {
            const cipherBytes = Buffer.from(encryptedCode, 'base64');
            const { plaintext } = await this.decrypt(this.keyring, cipherBytes);
            // Plain‑text returned may include HTML escapes for < and > in passwords
            return Buffer.from(plaintext).toString('utf8').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        } catch (err) {
            console.error('❌ KMS/EncryptionSDK decryption failed:', err);
            throw err;
        }
    }
}