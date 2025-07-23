interface User {
    email: string;
    phone_number?: string;
    password: string;
    tempPassword?: string;
    accessToken?: string;
    refreshToken?: string;
    sub_id?: string;
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