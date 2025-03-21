// middleware/adminAuth.js
export const adminAuth = (req, res, next) => {
    // Ensure req.user is populated by authenticateToken middleware first
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Admins only.' });
  };
  