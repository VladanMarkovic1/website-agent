// middleware/adminAuth.js
export const adminAuth = (req, res, next) => {
    // console.log(`[AdminAuthMiddleware] Checking access for path: ${req.path}`); // Log entry - REMOVED
    try {
        // Check if user exists and has required properties
        if (!req.user) {
            // console.log('[AdminAuthMiddleware] req.user is missing!'); // REMOVED
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // console.log(`[AdminAuthMiddleware] User found: ${req.user.email}, Role: ${req.user.role}`); // REMOVED
        // Strict role checking
        if (req.user.role !== 'admin') {
            // console.warn(`[AdminAuthMiddleware] Unauthorized role: ${req.user.role} for user: ${req.user.email}`); // REMOVED
            return res.status(403).json({ error: 'Forbidden: Admins only.' });
        }

        // console.log(`[AdminAuthMiddleware] Role check passed for admin user: ${req.user.email}`); // REMOVED
        // Add additional security checks
        if (!req.user.id || !req.user.email) {
            // console.warn('[AdminAuthMiddleware] Malformed user object in admin request:', req.user); // REMOVED
            return res.status(400).json({ error: 'Invalid user data.' });
        }

        // console.log(`[AdminAuthMiddleware] Sanity checks passed for: ${req.user.email}`); // REMOVED
        // Add admin user info to request for logging
        req.adminUser = {
            id: req.user.id,
            email: req.user.email,
            accessTime: new Date().toISOString()
        };

        next();
    } catch (error) {
        // console.error('[AdminAuthMiddleware] Error:', error); // REMOVED
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};
  