import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';

const cognitoClient =
    process.env.USE_MOCK_COGNITO === 'true' ? MockCognitoClient : Admin;

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, cognitoClient);
const authController = new AuthController(authService);

export default authController.router;
