import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const BusinessOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
  role: { type: String, default: "owner" }
}, { timestamps: true });

// Pre-save hook to hash password
BusinessOwnerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    console.log("Password hashed successfully for:", this.email);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare entered password with stored hashed password
BusinessOwnerSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log("Attempting to compare passwords:");
    console.log("Stored hash:", this.password);
    console.log("Provided password:", candidatePassword);
    
    const isMatch = await bcryptjs.compare(candidatePassword, this.password);
    console.log("Password comparison result:", isMatch);
    return isMatch;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw error;
  }
};

export default mongoose.model("BusinessOwner", BusinessOwnerSchema); 