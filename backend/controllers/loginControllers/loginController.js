import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import BusinessOwner from '../../models/BusinessOwner.js';
import dotenv from 'dotenv';
dotenv.config();

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt with:", {
    email,
    passwordProvided: !!password
  });

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await BusinessOwner.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        businessId: user.businessId,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ 
      token,
      user: {
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
