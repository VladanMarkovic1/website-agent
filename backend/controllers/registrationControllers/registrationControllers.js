import bcrypt from 'bcrypt';
import BusinessOwner from '../../models/BusinessOwner.js';
import Invitation from '../../models/Invitation.js';

export const registerUser = async (req, res) => {
  const { token, name, password } = req.body;

  // Ensure token, name, and password are provided
  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Token, name, and password are required.' });
  }

  try {
    // Look up the invitation by token
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }
    
    // Check if the invitation has expired
    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation token has expired.' });
    }
    
    // Use the email and businessId from the invitation
    const { email, businessId } = invitation;
    
    // Check if a BusinessOwner already exists with this email
    const existingOwner = await BusinessOwner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the BusinessOwner account
    const newOwner = await BusinessOwner.create({
      name,
      email,
      password: hashedPassword,
      businessId,
    });
    
    // Mark the invitation as used
    invitation.status = 'used';
    await invitation.save();
    
    return res.status(201).json({ success: true, message: 'Account created successfully!', newOwner });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};
