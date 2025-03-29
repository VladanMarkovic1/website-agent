import crypto from 'crypto';
import Invitation from '../../models/Invitation.js';
import BusinessOwner from '../../models/BusinessOwner.js';
import Business from '../../models/Business.js';
import { sendInvitationEmail } from '../../controllers/emailControllers/invitationEmailService.js';

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

export const getBusinessOwners = async (req, res) => {
  try {
    // Fetch business owners and join with businesses
    const businessOwners = await BusinessOwner.aggregate([
      {
        $match: { 
          role: 'owner'  // Changed from 'business-owner' to 'owner' based on your schema
        }
      },
      {
        $lookup: {
          from: 'businesses',
          localField: 'businessId',
          foreignField: 'businessId',
          as: 'business'
        }
      },
      {
        $unwind: {
          path: '$business',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          name: 1,  // Added name field from your schema
          businessName: '$business.businessName',
          businessId: 1,
          createdAt: 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!businessOwners) {
      return res.status(404).json({ error: 'No business owners found' });
    }

    // Remove sensitive information and format the response
    const sanitizedOwners = businessOwners.map(owner => ({
      id: owner._id,
      name: owner.name,
      email: owner.email,
      businessName: owner.businessName || 'No Business Assigned',
      businessId: owner.businessId
    }));

    return res.status(200).json(sanitizedOwners);
  } catch (error) {
    console.error('Error fetching business owners:', error);
    return res.status(500).json({ error: 'Failed to fetch business owners' });
  }
};

export const getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find(
      {},
      'businessId businessName websiteUrl'
    ).sort({ createdAt: -1 });

    if (!businesses) {
      return res.status(404).json({ error: 'No businesses found' });
    }

    return res.status(200).json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return res.status(500).json({ error: 'Failed to fetch businesses' });
  }
};

export default {
  sendInvitation,
  getBusinessOwners,
  getBusinesses
};
