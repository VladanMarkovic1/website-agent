// middleware/auth.js
console.log("🔄 IMPORTING AUTH MIDDLEWARE DEPENDENCIES...");
import jwt from 'jsonwebtoken';
console.log("✅ JWT IMPORTED");
import dotenv from 'dotenv';
console.log("✅ DOTENV IMPORTED");
dotenv.config();
console.log("✅ DOTENV CONFIGURED");

export const authenticateToken = (req, res, next) => {
  console.log("🔐 AUTHENTICATE TOKEN MIDDLEWARE CALLED");
  console.log("📋 REQUEST URL:", req.url);
  console.log("📋 REQUEST METHOD:", req.method);
  
  try {
    console.log("🔄 CHECKING AUTHORIZATION HEADER...");
    const authHeader = req.headers['authorization'];
    console.log("📋 AUTH HEADER:", authHeader ? 'PRESENT' : 'MISSING');
    
    const token = authHeader && authHeader.split(' ')[1]; // Expected format: "Bearer <token>"
    console.log("📋 TOKEN EXTRACTED:", token ? 'YES' : 'NO');
    
    if (!token) {
      console.log("❌ TOKEN MISSING - SENDING 401");
      return res.status(401).json({ error: 'Access denied, token missing!' });
    }

    console.log("🔄 VERIFYING JWT TOKEN...");
    console.log("📋 JWT_SECRET:", process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("❌ JWT VERIFICATION ERROR:", err.message);
        console.error("❌ JWT ERROR STACK:", err.stack);
        return res.status(403).json({ error: 'Invalid token!' });
      }
      
      console.log("✅ JWT VERIFICATION SUCCESSFUL");
      console.log("📊 DECODED TOKEN:", JSON.stringify(decoded, null, 2));
      
      req.user = decoded; // decoded contains your token payload (e.g., userId, businessId, role)
      console.log("✅ USER ATTACHED TO REQUEST");
      console.log("🔄 PROCEEDING TO NEXT MIDDLEWARE...");
      next();
    });
    
  } catch (error) {
    console.error("🚨 AUTHENTICATE TOKEN ERROR:", error.message);
    console.error("🚨 AUTHENTICATE TOKEN STACK:", error.stack);
    return res.status(500).json({ error: 'Authentication server error' });
  }
};

console.log("✅ AUTH MIDDLEWARE MODULE LOADED");
