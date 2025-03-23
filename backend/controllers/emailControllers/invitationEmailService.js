import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // true if using port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendInvitationEmail = async (email, invitationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "You're Invited to Register",
    text: `Please register your account using the following link: ${invitationLink}`,
    html: `<p>Please register your account using the following link: <a href="${invitationLink}">${invitationLink}</a></p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Invitation email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
};
