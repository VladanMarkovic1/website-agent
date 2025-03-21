import mongoose from 'mongoose';

const InvitationSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  businessId: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'used'], 
    default: 'pending' 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  }
});

export default mongoose.model('Invitation', InvitationSchema);
