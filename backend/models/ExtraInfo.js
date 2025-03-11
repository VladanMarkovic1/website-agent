import mongoose from "mongoose";

const ExtraInfoSchema = new mongoose.Schema({
    businessId: { type: String, required: true },
    testimonials: [{ type: String }],
    faqs: [
        {
            question: { type: String },
            answer: { type: String }
        }
    ],
    operatingHours: { type: String },
});

export default mongoose.model("ExtraInfo", ExtraInfoSchema);
