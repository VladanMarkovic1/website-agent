import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
    businessId: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
});

export default mongoose.model("Contact", ContactSchema);
