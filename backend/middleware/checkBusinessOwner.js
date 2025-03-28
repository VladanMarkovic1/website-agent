import Business from '../models/Business.js';
import mongoose from 'mongoose';

export const checkBusinessOwner = async (req, res, next) => {
    try {
        if (!req.user || !req.user.businessId) {
            return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
        }

        const requestedBusinessId = req.params.businessId;
        const userBusinessId = req.user.businessId;
        
        // Compare the requested businessId with user's businessId from token
        if (requestedBusinessId !== userBusinessId) {
            console.log('Business ID mismatch:', { requested: requestedBusinessId, user: userBusinessId });
            return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
        }

        // Find or create the business
        let business = await Business.findOne({ businessId: requestedBusinessId });
        
        if (!business) {
            // Create business if it doesn't exist
            business = await Business.create({
                businessId: requestedBusinessId,
                businessName: `Business ${requestedBusinessId}`,
                websiteUrl: `https://${requestedBusinessId}.com`
            });
            console.log('Created new business:', business);
        }

        // Add business to request for use in later middleware
        req.business = business;
        next();
    } catch (error) {
        console.error('Error in checkBusinessOwner:', error);
        res.status(500).json({ error: 'Internal server error checking business ownership.' });
    }
};
  