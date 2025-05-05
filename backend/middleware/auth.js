// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authenticateToken = (req, res, next) => {
  console.log(`[AuthMiddleware] Checking token for path: ${req.path}`); // Log entry
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected format: "Bearer <token>"
  
  if (!token) {
    console.log('[AuthMiddleware] Token missing');
    return res.status(401).json({ error: 'Access denied, token missing!' });
  }

  console.log('[AuthMiddleware] Token found, attempting verification...');
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('[AuthMiddleware] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token!' });
    }
    console.log(`[AuthMiddleware] Token verified successfully for user: ${decoded.email}`);
    req.user = decoded; // decoded contains your token payload (e.g., userId, businessId, role)
    next();
  });
};
