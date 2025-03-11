import mongoose from "mongoose";

const BusinessSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    businessName: { type: String, required: true },
    websiteUrl: { type: String, required: true },
}, { strictPopulate: false }); // Add this to allow missing fields

export default mongoose.model("Business", BusinessSchema);

