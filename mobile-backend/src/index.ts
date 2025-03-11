import process from "node:process";
import serverless from "serverless-http";
import dotenv from "dotenv";
dotenv.config();

import App from './utils/app';

import AuthController from './routes/auth'
import PostController from './routes/post'
import StudentController from './routes/student'
import ParentController from './routes/parent'
import FormController from './routes/form'

const app = new App([
    new AuthController(),
    new PostController(),
    new StudentController(),
    new ParentController(),
    new FormController()
]);


export const handler: serverless.Handler = serverless(app.listen());