import crypto from 'crypto';
import Invitation from '../../models/Invitation.js';
import { sendInvitationEmail } from '../../controllers/emailControllers/invitationEmailService.js';

export const sendInvitation = async (req, res) => {
  const { email, businessId } = req.body;

  if (!email || !businessId) {
    return res.status(400).json({ error: 'Email and businessId are required.' });
  }

  try {
    // Generate a unique token for the invitation
    const token = crypto.randomBytes(32).toString('hex');
    // Set the invitation to expire in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create the invitation record in the database
    const invitation = await Invitation.create({ email, token, businessId, expiresAt });

    // Construct the invitation link using the generated token
    const invitationLink = `https://yourdomain.com/register?token=${token}`;

    // Send the invitation email using our invitation email service
    await sendInvitationEmail(email, invitationLink);

    return res.json({ success: true, message: 'Invitation sent!', invitation });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.status(500).json({ error: 'Failed to send invitation.' });
  }
};
