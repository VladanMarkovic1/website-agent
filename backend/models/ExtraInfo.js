import mongoose from "mongoose";

const FeaturedServiceSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    displayName: { type: String, required: true }
}, { _id: false });

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
    featuredServices: [FeaturedServiceSchema],
});

export default mongoose.model("ExtraInfo", ExtraInfoSchema);
