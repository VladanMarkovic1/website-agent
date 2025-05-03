import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

// Initialize transporter using environment variables for Gmail
function initializeTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Error: EMAIL_USER and EMAIL_PASS environment variables are required for sending emails.');
        // Optionally, you could fall back to Ethereal here for testing if desired
        // or throw an error to prevent the app from starting without email config.
        return null; // Indicate failure to initialize
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail', // Default to gmail if not specified
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Remember to use App Password if 2FA is enabled
            },
            // Optional: Add connection timeout settings if needed
            // connectionTimeout: 5 * 60 * 1000, // 5 min
        });

        // Verify connection configuration
        transporter.verify(function(error, success) {
            if (error) {
                console.error('Nodemailer transporter verification failed:', error);
                // Handle verification error - maybe the credentials are wrong or Gmail blocks the connection
                transporter = null; // Reset transporter if verification fails
            } else {
                console.log('Nodemailer transporter is ready to send emails via', process.env.EMAIL_SERVICE || 'gmail');
            }
        });
    }
    return transporter;
}

// Initialize transporter when the module loads
transporter = initializeTransporter(); 

export const sendInvitationEmail = async (email, invitationLink) => {
    if (!transporter) {
        console.error('Email transporter is not initialized. Cannot send email.');
        // It might be better to throw an error that the calling function can catch
        throw new Error('Email service is not configured correctly.');
    }

    try {
        const mailOptions = {
            // Consider using EMAIL_USER as the from address or a dedicated verified alias
            from: `"Dental Website" <${process.env.EMAIL_USER}>`, 
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

        const info = await transporter.sendMail(mailOptions);
        console.log('Invitation email sent successfully:');
        // Removed Ethereal preview URL
        return { info }; // Return only the send info
    } catch (error) {
        console.error('Error sending invitation email via Nodemailer:', error);
        // Check for specific Nodemailer errors
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('Authentication error: Check EMAIL_USER and EMAIL_PASS (use App Password if 2FA enabled).');
        } else if (error.code === 'EENVELOPE' || error.responseCode === 550) {
             console.error('Recipient error: Check if the recipient email address is valid:', email);
        } else if (error.code === 'ECONNECTION' || error.responseCode === 500) {
             console.error('Connection error: Check network connection or Gmail service status.');
        }
        throw error; // Re-throw the error so the calling function knows it failed
    }
};
