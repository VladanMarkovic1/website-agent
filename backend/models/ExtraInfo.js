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
    availableDays: [{ type: String }],
    availableTimes: [{ type: String }],
    insuranceOptions: [{ type: String }],
    featuredServices: [{ type: String }],
});

export default mongoose.model("ExtraInfo", ExtraInfoSchema);
