import mongoose from "mongoose";

const SelectorsSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    serviceSelector: { type: String, required: true },
    aboutSelector: { type: String },
    contactSelector: { type: String },
    faqsSelector: { 
        question: { type: String },
        answer: { type: String }
    },
});

export default mongoose.model("Selectors", SelectorsSchema);

