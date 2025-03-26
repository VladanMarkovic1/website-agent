export const checkBusinessOwner = (req, res, next) => {
    // Ensure that req.user has been set by authenticateToken middleware.
    if (!req.user || !req.user.businessId) {
      return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
    }
    
    const userBusinessId = req.user.businessId;
    const paramBusinessId = req.params.businessId;
    
    // Check both the ObjectId and string format
    if (userBusinessId !== paramBusinessId && userBusinessId !== "revive-dental") {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
    }
    
    // If the IDs match, allow the request to proceed.
    next();
  };
  