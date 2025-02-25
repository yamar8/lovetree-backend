import validator from "validator";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import userModel from "../models/userModel.js";
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail } from '../config/emailService.js';
import * as crypto from 'crypto';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

// Get user profile
const getProfile = async (req, res) => {
    try {
        
        // const reqstring = JSON.stringify(req.body);
        // console.log("req.body: ", reqstring);
        const user = await userModel.findById(req.body.userId)
            .select('-password -verificationCode -verificationExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.body.userId; 

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        // Check if email is taken by another user
        const existingUser = await userModel.findOne({ 
            email,
            _id: { $ne: userId } // Exclude current user
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email is already in use'
            });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { name, email, phone },
            { new: true, runValidators: true }
        ).select('-password -verificationCode -verificationExpires');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.body.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Both current and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }

        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check if new password is same as old
        if (await bcrypt.compare(newPassword, user.password)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password'
            });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // Check if user exists
        let user = await userModel.findOne({ email });

        if (!user) {
            // Create new user with dummy password (not used for Google auth)
            const salt = await bcrypt.genSalt(10);
            const dummyPassword = Math.random().toString(36).slice(-8); // Generate random string
            const hashedPassword = await bcrypt.hash(dummyPassword, salt);

            user = new userModel({
                name,
                email,
                password: hashedPassword
            });
            
            await user.save();
        }

        // Create JWT token
        const authToken = createToken(user._id);
        res.json({ 
            success: true, 
            token: authToken,
            message: "Google authentication successful"
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Google authentication failed'
        });
    }
};
// Route for user login
const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User doesn't exists" })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {

            const token = createToken(user._id)
            res.json({ success: true, token })

        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        
        if (existingUser) {
            if (existingUser.verified) {
                return res.status(400).json({
                    success: false,
                    message: "User already exists with this email"
                });
            }
            
            // If user exists but isn't verified, update their verification code
            const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
            const verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
            
            existingUser.verificationCode = verificationCode;
            existingUser.verificationExpires = verificationExpires;
            await existingUser.save();
            
            await sendVerificationEmail(email, verificationCode);
            
            return res.json({
                success: true,
                message: "New verification code sent to your email"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification code
        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Create new user
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            verificationCode,
            verificationExpires,
            verified: false
        });

        await newUser.save();

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        res.json({
            success: true,
            message: "Verification code sent to your email. Please check your inbox."
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again later."
        });
    }
};

const verifyUser = async (req, res) => {
    try {
      const { email, code } = req.body;
      const user = await userModel.findOne({ email });
  
      if (!user || user.verificationCode !== code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid verification code' 
        });
      }
  
      if (Date.now() > user.verificationExpires) {
        return res.status(400).json({ 
          success: false, 
          message: 'Verification code expired' 
        });
      }
  
      user.verified = true;
      user.verificationCode = undefined;
      user.verificationExpires = undefined;
      await user.save();
  
      const token = createToken(user._id);
      res.json({ success: true, token });
    } catch (error) {
      // Error handling
    }
  };
  
// Route for admin login
const adminLogin = async (req, res) => {
    try {
        
        const {email,password} = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        } else {
            res.json({success:false,message:"Invalid credentials"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


export { googleLogin, loginUser, registerUser, adminLogin, verifyUser, getProfile, updateProfile, changePassword}