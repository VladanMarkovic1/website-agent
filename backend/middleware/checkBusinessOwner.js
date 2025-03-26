import Business from '../models/Business.js';
import mongoose from 'mongoose';

export const checkBusinessOwner = async (req, res, next) => {
    try {
        if (!req.user || !req.user.businessId) {
            return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
        }

        let business;
        const businessId = req.params.businessId;

        // First try to find by string businessId
        business = await Business.findOne({ businessId: businessId });

        // If not found and the ID looks like an ObjectId, try finding by _id
        if (!business && mongoose.Types.ObjectId.isValid(businessId)) {
            business = await Business.findById(businessId);
        }

        if (!business) {
            return res.status(404).json({ error: 'Business not found.' });
        }

        // Compare the found business._id with user's businessId
        if (business._id.toString() !== req.user.businessId.toString()) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
        }

        // Add business to request for use in later middleware
        req.business = business;
        next();
    } catch (error) {
        console.error('Error in checkBusinessOwner:', error);
        res.status(500).json({ error: 'Internal server error checking business ownership.' });
    }
};
  