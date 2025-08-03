interface User {
    email: string;
    phone_number?: string;
    password: string;
    tempPassword?: string;
    accessToken?: string;
    refreshToken?: string;
    sub_id?: string;
    resetCode?: string;
    resetCodeExpiry?: number;
}

const sub_id = '1'

const mockDatabase: { [email: string]: User } = {
    'firdavsgaybullayev22@gmail.com': {
        phone_number: '+998901234567',
        email: 'firdavsgaybullayev22@gmail.com',
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
        password: 'password',
        sub_id: sub_id
    }
};

export class MockCognitoClient {
    static async forgotPassword(identifier: string) {
        console.log(`Mock: Forgot password initiated for ${identifier}`);

        // In mock mode, we simulate the behavior
        const user = mockDatabase[identifier];
        if (!user) {
            // For security, we don't reveal if user exists or not
            console.log(`Mock: User ${identifier} not found, but returning success message`);
        } else {
            // Simulate sending verification code
            user.resetCode = '123456'; // Mock verification code
            user.resetCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
            console.log(`Mock: Reset code set for ${identifier}: ${user.resetCode}`);
        }

        return {
            message: 'If this phone number is registered, you will receive a verification code'
        };
    }

    static async confirmForgotPassword(identifier: string, confirmationCode: string, newPassword: string) {
        console.log(`Mock: Confirming forgot password for ${identifier} with code ${confirmationCode}`);

        const user = mockDatabase[identifier];
        if (!user) {
            throw new Error('User not found');
        }

        // Check if reset code exists and is valid
        if (!user.resetCode) {
            throw new Error('No reset code found. Please initiate forgot password first');
        }

        if (user.resetCode !== confirmationCode) {
            throw new Error('Invalid verification code');
        }

        if (user.resetCodeExpiry && Date.now() > user.resetCodeExpiry) {
            throw new Error('Verification code has expired');
        }

        // Validate password (basic validation for mock)
        if (newPassword.length < 8) {
            throw new Error('Password must contain at least 8 characters, 1 number, 1 special character, 1 uppercase, 1 lowercase');
        }

        // Update password and clear reset code
        user.password = newPassword;
        delete user.resetCode;
        delete user.resetCodeExpiry;

        console.log(`Mock: Password reset successfully for ${identifier}`);

        return {
            message: 'Password reset successfully'
        };
    }


    static async resendTemporaryPassword(identifier: string) {
        // Try to find user by email first, then by phone number
        let user: User | undefined = mockDatabase[identifier];

        if (!user) {
            // Try to find by phone number (for parents)
            user = Object.values(mockDatabase).find(u => u.phone_number === identifier);
        }

        if (!user) {
            throw new Error('User not found');
        }

        // Simulate resending temporary password
        // In mock mode, we just reset the temp password
        user.tempPassword = 'mockTempPassword123!';
        user.password = user.tempPassword; // In real Cognito, this would be handled automatically

        console.log(`Mock: Temporary password resent for ${identifier}`);

        return {
            message: 'Temporary password resent successfully'
        };
    }

    static async login(email: string, password: string) {
        const user = mockDatabase[email];
        if (!user || user.password !== password) {
            throw new Error('Invalid email or password');
        }
        user.accessToken = 'mockAccessToken';
        user.refreshToken = 'mockRefreshToken';
        return {
            accessToken: user.accessToken,
            refreshToken: user.refreshToken
        };
    }

    static async refreshToken(refreshToken: string) {
        const user = Object.values(mockDatabase).find(user => user.refreshToken === refreshToken);
        if (!user) {
            throw new Error('Invalid refresh token');
        }
        user.accessToken = 'mockAccessToken';
        return {
            accessToken: user.accessToken
        };
    }

    static async changeTempPassword(email: string, tempPassword: string, newPassword: string) {
        const user = mockDatabase[email];
        if (!user || user.tempPassword !== tempPassword) {
            throw new Error('Invalid email or temporary password');
        }
        user.password = newPassword;
        user.tempPassword = undefined;
        user.accessToken = 'mockAccessToken';
        user.refreshToken = 'mockRefreshToken';
        return {
            accessToken: user.accessToken,
            refreshToken: user.refreshToken
        };
    }

    static async changePassword(accessToken: string, previousPassword: string, newPassword: string) {
        const user = Object.values(mockDatabase).find(user => user.accessToken === accessToken);
        if (!user || user.password !== previousPassword) {
            throw new Error('Invalid access token or previous password');
        }
        user.password = newPassword;
        return {
            state: 'SUCCESS'
        };
    }

    static async delete(email: string) {
        if (!mockDatabase[email]) {
            throw new Error('User not found');
        }
        delete mockDatabase[email];
        return { message: 'User deleted successfully' };
    }

    static async register(email: string) {
        if (mockDatabase[email]) {
            throw new Error('Email already exists');
        }
        mockDatabase[email] = { email, password: 'tempPassword', sub_id: sub_id };
        return { sub_id: sub_id };
    }

    static async accessToken(accessToken: string) {
        const user = Object.values(mockDatabase).find(user => user.accessToken === accessToken);

        if (!user) {
            throw new Error('Invalid access token');
        }
        return {
            email: user.email,
            phone_number: user.phone_number ?? '',
            sub_id: user.sub_id ?? ''
        };
    }
}