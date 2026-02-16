import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Admin } from '../../utils/cognito-client';
import { MockCognitoClient } from '../../utils/mock-cognito-client';
import { config } from '../../config';

const cognitoClient = config.USE_MOCK_COGNITO ? MockCognitoClient : Admin;

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, cognitoClient);
const authController = new AuthController(authService);

export default authController.router;
