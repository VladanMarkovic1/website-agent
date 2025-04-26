import BusinessOwner from '../../models/BusinessOwner.js';
import Invitation from '../../models/Invitation.js';

export const registerUser = async (req, res) => {
  const { token, name, password } = req.body;

  // console.log("Registration attempt with:", { name, token: !!token });

  // Ensure token, name, and password are provided
  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Token, name, and password are required.' });
  }

  try {
    // Look up the invitation by token
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) {
      // console.log("Invalid or expired invitation token");
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }
    
    // Check if the invitation has expired
    if (invitation.expiresAt < new Date()) {
      // console.log("Invitation token has expired");
      return res.status(400).json({ error: 'Invitation token has expired.' });
    }
    
    // Use the email and businessId from the invitation
    const { email, businessId } = invitation;
    
    // Check if a BusinessOwner already exists with this email
    const existingOwner = await BusinessOwner.findOne({ email });
    if (existingOwner) {
      // console.log("Account already exists for email:", email);
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    
    // Create the BusinessOwner account - let the pre-save hook handle password hashing
    const newOwner = await BusinessOwner.create({
      name,
      email,
      password, // Pass the plain password, model's pre-save hook will hash it
      businessId,
      role: 'owner' // Set default role
    });

    // console.log("Business owner created successfully:", {
    //   name: newOwner.name,
    //   email: newOwner.email,
    //   businessId: newOwner.businessId
    // });
    
    // Mark the invitation as used
    invitation.status = 'used';
    await invitation.save();
    
    return res.status(201).json({ 
      success: true, 
      message: 'Account created successfully!',
      user: {
        name: newOwner.name,
        email: newOwner.email,
        businessId: newOwner.businessId,
        role: newOwner.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};
