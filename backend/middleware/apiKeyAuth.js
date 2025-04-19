import Business from '../models/Business.js'; // Import Business model
// Remove dotenv and global key logic
// import dotenv from 'dotenv';
// dotenv.config(); 
// const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY;
// if (!CHATBOT_API_KEY) { ... }

export const apiKeyAuth = async (req, res, next) => { // Make async
  const apiKey = req.headers['x-api-key']; 
  const { businessId } = req.params; // Get businessId from route params

  if (!apiKey) {
    console.warn(`[apiKeyAuth] Missing API Key for business: ${businessId || 'Unknown'}`);
    return res.status(401).json({ success: false, error: 'API Key is missing' });
  }

  if (!businessId) {
    // This should be caught by route validation ideally, but good to double-check
    console.error('[apiKeyAuth] Business ID missing from request parameters');
    return res.status(400).json({ success: false, error: 'Business ID missing in request' });
  }

  try {
    // Fetch the business, explicitly selecting the apiKeyHash
    const business = await Business.findOne({ businessId }).select('+apiKeyHash');

    if (!business) {
      console.warn(`[apiKeyAuth] Business not found for ID: ${businessId}`);
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    if (!business.apiKeyHash) {
        console.warn(`[apiKeyAuth] API Key not generated for business: ${businessId}`);
        return res.status(403).json({ success: false, error: 'API Key not configured for this business' });
    }

    // Compare the provided key with the stored hash
    const isValid = await business.compareApiKey(apiKey);

    if (!isValid) {
      console.warn(`[apiKeyAuth] Invalid API Key provided for business: ${businessId}`);
      return res.status(403).json({ success: false, error: 'Invalid API Key' });
    }

    // API Key is valid for this business
    console.log(`[apiKeyAuth] Valid API Key received for business: ${businessId}`);
    next();
  } catch (error) {
    console.error(`[apiKeyAuth] Error during API key validation for business ${businessId}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error during API key validation' });
  }
}; 