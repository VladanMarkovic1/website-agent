import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import BusinessOwner from '../../models/BusinessOwner.js';
import dotenv from 'dotenv';
dotenv.config();

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Look up the BusinessOwner by email
    const user = await BusinessOwner.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Compare provided password with stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Prepare JWT payload
    const payload = {
      userId: user._id,
      businessId: user.businessId,
      role: user.role
    };

    // Sign the JWT using the secret and set an expiration time
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ token, message: "Login successful." });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error." });
  }
};
