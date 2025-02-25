import express from 'express';
import { loginUser,registerUser,adminLogin, googleLogin, verifyUser, getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import authUser from '../middleware/auth.js'

const userRouter = express.Router();

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.post('/google-login',googleLogin)
userRouter.post('/admin',adminLogin)
userRouter.post('/verify', verifyUser);
userRouter.get('/get-profile', authUser, getProfile);
userRouter.put('/update-profile', authUser, updateProfile);
userRouter.post('/change-password', authUser, changePassword);

export default userRouter;