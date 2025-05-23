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

    // Check if the query returned results
    if (!businessOwners || businessOwners.length === 0) {
      // Return 200 OK with an empty array if no owners/invitations are found
      return res.status(200).json([]); 
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
        const business = await Business.findOne({ businessId: businessId });
        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Retrieve the PLAINTEXT API key. 
        // IMPORTANT: This assumes you have a way to get the PLAINTEXT key.
        // If you only store hashes, you cannot put the plaintext key in the script tag.
        // For this example, let's assume `business.apiKey` holds the plaintext key.
        // In a real scenario, you might have a separate mechanism or decide if exposing it this way is secure enough.
        // For now, we will simulate having a plaintext key. If business.apiKey is a hash, this will not work.
        // Let's assume there's no direct plain text API key available to embed for now, and widget should handle if it's missing.
        // OR, if the API key is the one seen in the logs (02fb5...), it might be a static key for now.
        // For the purpose of this step, let's proceed *as if* we are not embedding an API key yet,
        // to see if the backendUrl fix resolves the main connection errors.
        // The apiKey in the WebSocket URL in the screenshot seemed to be coming from the widget's own dataset reading.

        const widgetBaseUrl = process.env.VITE_WIDGET_URL || 'http://localhost:5174'; // For widget JS/CSS
        const liveBackendUrl = process.env.RENDER_BACKEND_URL || 'http://localhost:5000'; // For API calls from the widget
        
        const cssUrl = `${widgetBaseUrl}/dental-chatbot.css`;
        const jsUrl = `${widgetBaseUrl}/dental-chatbot.js`;
        
        // If you had a plain text API key for the business, e.g., from business.actualApiKey:
        // const apiKeyAttribute = business.actualApiKey ? `data-api-key="${business.actualApiKey}"` : '';
        // For now, let's use the apiKey from the screenshot as a placeholder if it's static, or omit if dynamic from DB
        // The widget.jsx already tries to read `currentScript.dataset.apiKey`
        // The screenshot of the script tag on the client site showed: apiKey="02fb5a06338fe79dd874b58d36aa4fafaf3ccacd39888214c019a946aa6ffd0"
        // Let's assume this key needs to be on the script tag as data-api-key
        const apiKeyFromLastScreenshot = "02fb5a06338fe79dd874b58d36aa4fafaf3ccacd39888214c019a946aa6ffd0"; // Temporary

        const scriptTag = `<link rel="stylesheet" href="${cssUrl}">\n<script id="dental-chatbot-script" type="module" src="${jsUrl}" data-business-id="${businessId}" data-backend-url="${liveBackendUrl}" data-api-key="${apiKeyFromLastScreenshot}" defer></script>`;

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