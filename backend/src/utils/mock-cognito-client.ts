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

const sub_id = '1';

// Usee Map instead of plain object to prevent prototype pollution
const mockDatabase: Map<string, User> = new Map([
    [
        'firdavsgaybullayev22@gmail.com',
        {
            phone_number: '+998901234567',
            email: 'firdavsgaybullayev22@gmail.com',
            accessToken: 'mockAccessToken',
            refreshToken: 'mockRefreshToken',
            password: 'password',
            sub_id: sub_id,
        },
    ],
]);

export class MockCognitoClient {
    static async forgotPassword(identifier: string) {
        console.log('Mock: Forgot password initiated for %s', identifier); // Fixed: Use %s placeholder

        // Prevent prototype pollution via dangerous keys
        if (
            identifier === '__proto__' ||
            identifier === 'constructor' ||
            identifier === 'prototype'
        ) {
            console.warn(
                'Mock: Attempted prototype polluting identifier: %s',
                identifier
            );
            return {
                message:
                    'If this phone number is registered, you will receive a verification code',
            };
        }

        // In mock mode, we simulate the behavior
        const user = mockDatabase.get(identifier); // Use Map.get() instead of bracket notation
        if (!user) {
            // For security, we don't reveal if user exists or not
            console.log(
                'Mock: User %s not found, but returning success message',
                identifier
            );
        } else {
            // Simulate sending verification code
            user.resetCode = '123456'; // Mock verification code
            user.resetCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
            mockDatabase.set(identifier, user); // Ensure updated user is stored
            console.log(
                'Mock: Reset code set for %s: %s',
                identifier,
                user.resetCode
            );
        }

        return {
            message:
                'If this phone number is registered, you will receive a verification code',
        };
    }

    static async confirmForgotPassword(
        identifier: string,
        confirmationCode: string,
        newPassword: string
    ) {
        console.log(
            'Mock: Confirming forgot password for %s with code %s',
            identifier,
            confirmationCode
        );

        // Prevent prototype pollution via dangerous keys
        if (
            identifier === '__proto__' ||
            identifier === 'constructor' ||
            identifier === 'prototype'
        ) {
            throw new Error('Invalid identifier');
        }

        const user = mockDatabase.get(identifier); // Use Map.get() instead of bracket notation
        if (!user) {
            throw new Error('User not found');
        }

        // Check if reset code exists and is valid
        if (!user.resetCode) {
            throw new Error(
                'No reset code found. Please initiate forgot password first'
            );
        }

        if (user.resetCode !== confirmationCode) {
            throw new Error('Invalid verification code');
        }

        if (user.resetCodeExpiry && Date.now() > user.resetCodeExpiry) {
            throw new Error('Verification code has expired');
        }

        // Validate password (basic validation for mock)
        if (newPassword.length < 8) {
            throw new Error(
                'Password must contain at least 8 characters, 1 number, 1 special character, 1 uppercase, 1 lowercase'
            );
        }

        // Update password and clear reset code
        user.password = newPassword;
        delete user.resetCode;
        delete user.resetCodeExpiry;

        mockDatabase.set(identifier, user); // Store updated user
        console.log('Mock: Password reset successfully for %s', identifier);

        return {
            message: 'Password reset successfully',
        };
    }

    // Update other methods to use Map instead of object access
    static async login(email: string, password: string) {
        const user = mockDatabase.get(email); // Use Map.get()
        if (!user || user.password !== password) {
            throw new Error('Invalid email or password');
        }
        user.accessToken = 'mockAccessToken';
        user.refreshToken = 'mockRefreshToken';
        mockDatabase.set(email, user); // Store updated user
        return {
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
        };
    }

    static async refreshToken(refreshToken: string) {
        // Find user by refreshToken using Map iteration
        let foundUser: User | undefined;
        let foundKey: string | undefined;

        for (const [key, user] of mockDatabase) {
            if (user.refreshToken === refreshToken) {
                foundUser = user;
                foundKey = key;
                break;
            }
        }

        if (!foundUser || !foundKey) {
            throw new Error('Invalid refresh token');
        }

        foundUser.accessToken = 'mockAccessToken';
        mockDatabase.set(foundKey, foundUser);
        return {
            accessToken: foundUser.accessToken,
        };
    }

    static async accessToken(accessToken: string) {
        // Find user by accessToken using Map iteration
        let foundUser: User | undefined;

        for (const [, user] of mockDatabase) {
            if (user.accessToken === accessToken) {
                foundUser = user;
                break;
            }
        }

        if (!foundUser) {
            throw new Error('Invalid access token');
        }
        return {
            email: foundUser.email,
            phone_number: foundUser.phone_number ?? '',
            sub_id: foundUser.sub_id ?? '',
        };
    }
}
