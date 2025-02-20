import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
    businessId: { type: String, required: true, index: true }, // Indexing for faster lookups
    services: [
        {
            name: { type: String, required: true, trim: true },
            description: { type: String, trim: true },
            price: { type: String, trim: true },
            manualOverride: { type: Boolean, default: false }
        }
    ]
}, { timestamps: true }); // Automatically adds createdAt & updatedAt fields

export default mongoose.model("Service", ServiceSchema);

