import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        };

        await transporter.sendMail(mailOptions);
        console.log(`Follow-up email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

export default sendEmail;
