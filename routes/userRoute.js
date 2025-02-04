import express from 'express';
import { loginUser,registerUser,adminLogin, googleLogin } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.post('/google-login',googleLogin)
userRouter.post('/admin',adminLogin)

export default userRouter;