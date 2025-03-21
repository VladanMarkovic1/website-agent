// middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expected format: "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing!' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token!' });
    }
    req.user = decoded; // decoded contains your token payload (e.g., userId, businessId, role)
    next();
  });
};
