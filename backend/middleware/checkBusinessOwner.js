import Business from '../models/Business.js';
import mongoose from 'mongoose';

export const checkBusinessOwner = async (req, res, next) => {
    try {
        // If the user is an admin, bypass this middleware entirely
        if (req.user && req.user.role === 'admin') {
            return next(); 
        }

        if (!req.user || !req.user.businessId) {
            return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
        }

        // Check for either clientId or businessId in params
        const requestedId = req.params.clientId || req.params.businessId;
        const userBusinessId = req.user.businessId;

        if (!requestedId) {
            return res.status(400).json({ error: 'Bad Request: Missing business identifier in URL.'});
        }
        
        // Compare the requested ID with user's businessId from token
        if (requestedId !== userBusinessId) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
        }

        // Find or create the business using the validated ID
        let business = await Business.findOne({ businessId: requestedId });
        
        if (!business) {
            return res.status(404).json({ error: 'Business record not found for the specified ID.' });
        }

        // Add business to request for use in later middleware/controllers
        req.business = business;
        next();
        
    } catch (error) {
        console.error("Business owner check error:", error.message);
        res.status(500).json({ error: 'Internal server error checking business ownership.' });
    }
};
  