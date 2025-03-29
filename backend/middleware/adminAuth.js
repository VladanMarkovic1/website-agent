// middleware/adminAuth.js
export const adminAuth = (req, res, next) => {
    try {
        // Check if user exists and has required properties
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // Strict role checking
        if (req.user.role !== 'admin') {
            console.warn(`Unauthorized admin access attempt from user: ${req.user.email}`);
            return res.status(403).json({ error: 'Forbidden: Admins only.' });
        }

        // Add additional security checks
        if (!req.user.id || !req.user.email) {
            console.warn('Malformed user object in admin request');
            return res.status(400).json({ error: 'Invalid user data.' });
        }

        // Add admin user info to request for logging
        req.adminUser = {
            id: req.user.id,
            email: req.user.email,
            accessTime: new Date().toISOString()
        };

        next();
    } catch (error) {
        console.error('Error in admin authentication:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};
  