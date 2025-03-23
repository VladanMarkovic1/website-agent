// BusinessOwner.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BusinessOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
  role: { type: String, default: "owner" } // Add this field, defaulting to "owner"
}, { timestamps: true });

BusinessOwnerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

BusinessOwnerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("BusinessOwner", BusinessOwnerSchema);
