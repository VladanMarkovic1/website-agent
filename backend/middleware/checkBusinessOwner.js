console.log("🔄 IMPORTING BUSINESS OWNER MIDDLEWARE DEPENDENCIES...");
import Business from '../models/Business.js';
console.log("✅ BUSINESS MODEL IMPORTED");
import mongoose from 'mongoose';
console.log("✅ MONGOOSE IMPORTED");

export const checkBusinessOwner = async (req, res, next) => {
    console.log("👤 CHECK BUSINESS OWNER MIDDLEWARE CALLED");
    console.log("📋 REQUEST URL:", req.url);
    console.log("📋 REQUEST PARAMS:", JSON.stringify(req.params, null, 2));
    console.log("📋 REQUEST USER:", JSON.stringify(req.user, null, 2));
    
    try {
        console.log("🔄 CHECKING USER ROLE...");
        // If the user is an admin, bypass this middleware entirely
        if (req.user && req.user.role === 'admin') {
            console.log("👑 ADMIN USER DETECTED - BYPASSING BUSINESS OWNER CHECK");
            return next(); 
        }

        console.log("🔄 CHECKING USER BUSINESS INFO...");
        if (!req.user || !req.user.businessId) {
            console.log("❌ NO BUSINESS INFORMATION IN TOKEN");
            return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
        }

        console.log("🔄 EXTRACTING REQUEST IDS...");
        // Check for either clientId or businessId in params
        const requestedId = req.params.clientId || req.params.businessId;
        const userBusinessId = req.user.businessId;
        console.log("📋 REQUESTED ID:", requestedId);
        console.log("📋 USER BUSINESS ID:", userBusinessId);

        if (!requestedId) {
            console.error("❌ MISSING BUSINESS IDENTIFIER IN URL");
            return res.status(400).json({ error: 'Bad Request: Missing business identifier in URL.'});
        }
        
        console.log("🔄 COMPARING BUSINESS IDS...");
        // Compare the requested ID with user's businessId from token
        if (requestedId !== userBusinessId) {
            console.log("❌ BUSINESS ID MISMATCH");
            console.log("📊 MISMATCH DETAILS:", { requested: requestedId, user: userBusinessId });
            return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
        }

        console.log("✅ BUSINESS ID MATCH CONFIRMED");
        console.log("🔄 LOOKING UP BUSINESS IN DATABASE...");
        
        // Find or create the business using the validated ID
        let business = await Business.findOne({ businessId: requestedId });
        console.log("✅ BUSINESS DATABASE QUERY COMPLETED");
        
        if (!business) {
            console.warn("❌ BUSINESS NOT FOUND IN DATABASE");
            console.warn(`📋 BUSINESS ID SEARCHED: ${requestedId}`);
            return res.status(404).json({ error: 'Business record not found for the specified ID.' });
        }

        console.log("✅ BUSINESS FOUND IN DATABASE");
        console.log("📊 BUSINESS DATA:", JSON.stringify(business, null, 2));
        
        // Add business to request for use in later middleware/controllers
        console.log("🔄 ATTACHING BUSINESS TO REQUEST...");
        req.business = business;
        console.log("✅ BUSINESS ATTACHED TO REQUEST");
        console.log("🔄 PROCEEDING TO NEXT MIDDLEWARE...");
        next();
        
    } catch (error) {
        console.error("🚨 BUSINESS OWNER CHECK ERROR:", error.message);
        console.error("🚨 BUSINESS OWNER ERROR STACK:", error.stack);
        console.error("🚨 ERROR DETAILS:", {
            url: req.url,
            params: req.params,
            user: req.user,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Internal server error checking business ownership.' });
    }
};

console.log("✅ BUSINESS OWNER MIDDLEWARE MODULE LOADED");
  