export const checkBusinessOwner = (req, res, next) => {
    // Ensure that req.user has been set by authenticateToken middleware.
    if (!req.user || !req.user.businessId) {
      return res.status(403).json({ error: 'Forbidden: No business information found in token.' });
    }
    
    // Check if the businessId from the JWT (req.user) matches the one in the route parameters.
    if (req.user.businessId !== req.params.businessId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to access this business data.' });
    }
    
    // If the IDs match, allow the request to proceed.
    next();
  };
  