import Business from '../models/Business.js';
import mongoose from 'mongoose';

export const checkBusinessOwner = async (req, res, next) => {
    try {
        // If the user is an admin, bypass this middleware entirely
        if (req.user && req.user.role === 'admin') {
            // console.log('[checkBusinessOwner] Skipping check for admin user.');
            return next(); 
        }

        if (!req.user || !req.user.businessId) {
            return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
        }

        // Check for either clientId or businessId in params
        const requestedId = req.params.clientId || req.params.businessId;
        const userBusinessId = req.user.businessId;

        if (!requestedId) {
            console.error('[checkBusinessOwner] Missing clientId or businessId in route parameters.');
            return res.status(400).json({ error: 'Bad Request: Missing business identifier in URL.'});
        }
        
        // Compare the requested ID with user's businessId from token
        if (requestedId !== userBusinessId) {
            // console.log('Business ID mismatch:', { requested: requestedId, user: userBusinessId });
            return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
        }

        // Find or create the business using the validated ID
        let business = await Business.findOne({ businessId: requestedId });
        
        if (!business) {
            // Re-evaluate if auto-creation is desired. If so, ensure required fields are handled.
            // For now, returning 404 might be safer than auto-creating with potentially missing info.
            console.warn(`[checkBusinessOwner] Business not found for ID: ${requestedId}, and auto-creation is disabled/risky.`);
             return res.status(404).json({ error: 'Business record not found for the specified ID.' });
            /* // Previous auto-create logic (use with caution):
            business = await Business.create({
                businessId: requestedId,
                businessName: `Business ${requestedId}`,
                websiteUrl: `https://default.com` 
            });
            console.log('Auto-created new business during ownership check:', business);
            */
        }

        // Add business to request for use in later middleware/controllers
        req.business = business;
        next();
    } catch (error) {
        console.error('Error in checkBusinessOwner:', error);
        res.status(500).json({ error: 'Internal server error checking business ownership.' });
    }
};
  