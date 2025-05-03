import Invitation from '../../models/Invitation.js';
import Business from '../../models/Business.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import BusinessOwner from '../../models/BusinessOwner.js';

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

export const deleteBusinessOwner = async (req, res) => {
  const { email } = req.params; // Get email from URL parameter

  // Basic email validation (consider a more robust library like validator.js if needed)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Invalid email format received for deletion: ${email}`);
    return res.status(400).json({ error: 'Invalid email format provided.' });
  }

  try {
    let ownerDeleted = false;
    let invitationsDeleted = 0;

    // Attempt to delete the BusinessOwner account (if it exists)
    const deletedOwner = await BusinessOwner.findOneAndDelete({ email: email });
    if (deletedOwner) {
      ownerDeleted = true;
    }

    // Attempt to delete any Invitation records associated with the email
    const deleteResult = await Invitation.deleteMany({ email: email });
    invitationsDeleted = deleteResult.deletedCount || 0;

    // Check if anything was actually deleted
    if (!ownerDeleted && invitationsDeleted === 0) {
      return res.status(404).json({ error: 'No user account or invitation found for this email.' });
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted records for ${email}. Owner account deleted: ${ownerDeleted}. Invitations deleted: ${invitationsDeleted}.`
  });

} catch (error) {
  console.error(`Error during deletion process for email ${email}:`, error);
  res.status(500).json({ error: 'Failed to delete user records.' });
}
};

export const updateBusinessOwner = async (req, res) => {
  const { ownerId } = req.params;
  const { businessId } = req.body; // Only allowing businessId update for now

  if (!mongoose.Types.ObjectId.isValid(ownerId)) {
    return res.status(400).json({ error: 'Invalid Owner ID format' });
  }
  if (!businessId) {
      return res.status(400).json({ error: 'New Business ID is required' });
  }

  try {
    // Find the business to ensure it exists
    const businessExists = await Business.findOne({ businessId: businessId });
    if (!businessExists) {
        return res.status(404).json({ error: 'Target business not found' });
    }

    // Find and update the invitation
    const updatedInvitation = await Invitation.findByIdAndUpdate(
      ownerId,
      { $set: { businessId: businessId } },
      { new: true, runValidators: true } // Return the updated doc and run schema validators
    );

    if (!updatedInvitation) {
      return res.status(404).json({ error: 'Invitation record not found for this owner ID' });
    }

    // Optionally, update the corresponding BusinessOwner record if it exists
    // await BusinessOwner.findOneAndUpdate({ email: updatedInvitation.email }, { businessId: businessId });

    res.status(200).json({ 
      message: 'Business owner assignment updated successfully',
      owner: updatedInvitation // Send back the updated record
    });
  } catch (error) {
    console.error('Error updating business owner assignment:', error);
    res.status(500).json({ error: 'Failed to update business owner assignment' });
  }
};

export const generateScriptTag = async (req, res) => {
    const { businessId } = req.params;

    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required' });
    }

    try {
        // Optional: Verify businessId actually exists in the Business collection
        const businessExists = await Business.findOne({ businessId: businessId });
        if (!businessExists) {
            return res.status(404).json({ error: 'Business not found' });
        }
        
        // Construct the script tag
        // Ensure VITE_WIDGET_URL is set in your backend environment variables
        const widgetBaseUrl = process.env.VITE_WIDGET_URL || 'http://localhost:5174'; // Default if not set
        const scriptTag = `<script src="${widgetBaseUrl}/widget.js" data-business-id="${businessId}" defer></script>`;

        res.status(200).json({ scriptTag });

    } catch (error) {
        console.error('Error generating script tag:', error);
        res.status(500).json({ error: 'Failed to generate script tag' });
    }
};

export const generateApiKey = async (req, res) => {
    const { businessId } = req.params;

    if (!businessId) {
        return res.status(400).json({ error: 'Business ID parameter is required' });
    }

    try {
        const business = await Business.findOne({ businessId });
        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Generate a new secure random API key
        const apiKey = crypto.randomBytes(32).toString('hex'); // 64 characters
        const saltRounds = 10; // Standard salt rounds
        const apiKeyHash = await bcrypt.hash(apiKey, saltRounds);

        // Save the hash to the business document
        business.apiKeyHash = apiKeyHash;
        await business.save();

        // Return the PLAINTEXT key ONCE
        res.status(200).json({
            message: `API Key generated successfully for ${business.businessName}. Store this key securely, it will not be shown again.`,
            apiKey: apiKey 
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({ error: 'Failed to generate API key' });
    }
};

export default {
    getBusinessOwners,
    getBusinesses,
    deleteBusinessOwner,
    updateBusinessOwner,
    generateScriptTag,
    generateApiKey
}; 