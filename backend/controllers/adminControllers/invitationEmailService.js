import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

// Initialize transporter with Ethereal account
async function createTransporter() {
    if (!transporter) {
        // Create Ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        console.log('Test Account:', testAccount);

        // Create reusable transporter
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
    return transporter;
}

export const sendInvitationEmail = async (email, invitationLink) => {
    try {
        console.log('Sending invitation email to:', email);
        
        const transport = await createTransporter();
        
        const mailOptions = {
            from: '"Dental Website" <test@dental.com>',
            to: email,
            subject: "You're Invited to Register",
            text: `Please register your account using the following link: ${invitationLink}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to Dental Website!</h2>
                    <p>You've been invited to create an account on our platform.</p>
                    <p>Please click the link below to complete your registration:</p>
                    <p><a href="${invitationLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Register Now</a></p>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="color: #4B5563;">${invitationLink}</p>
                    <p><strong>Note:</strong> This invitation link will expire in 24 hours.</p>
                    <br>
                    <p>Best regards,</p>
                    <p>The Dental Website Team</p>
                </div>
            `
        };

        const info = await transport.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewUrl);
        return { info, previewUrl };
    } catch (error) {
        console.error('Error sending invitation email:', error);
        throw error;
    }
};
