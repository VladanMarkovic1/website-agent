import mongoose from "mongoose";

const ContactSelectorSchema = new mongoose.Schema({
    phone: { type: String },
    email: { type: String },
    address: { type: String }
}, { _id: false });

const SelectorsSchema = new mongoose.Schema({
    businessId: { type: String, required: true, unique: true },
    serviceSelector: { type: String, required: true },
    aboutSelector: { type: String },
    contactSelector: { type: ContactSelectorSchema },
    faqsSelector: { 
        question: { type: String },
        answer: { type: String }
    },
});

export default mongoose.model("Selectors", SelectorsSchema);

