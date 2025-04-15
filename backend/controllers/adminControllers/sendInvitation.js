import crypto from 'crypto';
import Invitation from '../../models/Invitation.js';
import { sendInvitationEmail } from '../emailControllers/invitationEmailService.js';

export const sendInvitation = async (req, res) => {
  const { email, businessId } = req.body;

  if (!email || !businessId) {
    return res.status(400).json({ error: 'Email and businessId are required.' });
  }

  try {
    // Generate a unique token for the invitation
    const token = crypto.randomBytes(32).toString('hex');
    // Set the invitation to expire in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create the invitation record in the database
    const invitation = await Invitation.create({ email, token, businessId, expiresAt });

    // Construct the invitation link using the generated token
    const invitationLink = `${process.env.FRONTEND_URL}/register?token=${token}`;

    // Send the invitation email using our invitation email service
    const emailResult = await sendInvitationEmail(email, invitationLink);

    return res.status(201).json({
      success: true,
      message: 'Invitation created and email sent successfully',
      invitation: {
        email: invitation.email,
        token: invitation.token,
        businessId: invitation.businessId,
        expiresAt: invitation.expiresAt
      },
      emailPreviewUrl: emailResult.previewUrl
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.status(500).json({ error: 'Failed to send invitation.' });
  }
};

export default {
  sendInvitation
};
