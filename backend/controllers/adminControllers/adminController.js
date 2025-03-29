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
    // Start with invitations and join with business owners
    const businessOwners = await Invitation.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$email',
          latestInvitation: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'businessowners',
          let: { ownerEmail: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$email', '$$ownerEmail'] }
              }
            }
          ],
          as: 'owner'
        }
      },
      {
        $lookup: {
          from: 'businesses',
          let: { businessId: '$latestInvitation.businessId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$businessId', '$$businessId'] }
              }
            }
          ],
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
          _id: { $arrayElemAt: ['$owner._id', 0] },
          email: '$_id',
          name: { $arrayElemAt: ['$owner.name', 0] },
          businessName: '$business.businessName',
          businessId: '$latestInvitation.businessId',
          status: '$latestInvitation.status',
          createdAt: '$latestInvitation.createdAt'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!businessOwners || businessOwners.length === 0) {
      return res.status(404).json({ error: 'No business owners or invitations found' });
    }

    // Format the response
    const sanitizedOwners = businessOwners.map(owner => ({
      id: owner._id || 'pending_' + owner.email,
      name: owner.name || 'Pending Registration',
      email: owner.email,
      businessName: owner.businessName || 'No Business Assigned',
      businessId: owner.businessId,
      status: owner.status
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
