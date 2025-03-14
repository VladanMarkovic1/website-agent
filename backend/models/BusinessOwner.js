import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BusinessOwnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" }, // Link to business
}, { timestamps: true });

// Hash password before saving
BusinessOwnerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare entered password with hashed password
BusinessOwnerSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("BusinessOwner", BusinessOwnerSchema);
