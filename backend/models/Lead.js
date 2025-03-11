import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
    businessId: { type: String, required: true }, // Links lead to business
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    serviceInterest: { type: String, required: true }, // Which service user is interested in
    status: { 
        type: String, 
        enum: ["new", "contacted", "converted"], 
        default: "new" 
    }, // Lead status tracking
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Lead", LeadSchema);
