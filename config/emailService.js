import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Your verification code is:</p>
                <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #2c3e50;">
                    ${code}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="color: #666; margin-top: 30px;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Email sending error:", error);
        throw new Error("Failed to send verification email");
    }
};