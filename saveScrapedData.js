import Business from '../models/Business.js';
import Contact from '../models/Contact.js';
import Service from '../models/Service.js';
import FAQ from '../models/ExtraInfo.js';

const saveScrapedData = async (businessId, scrapedData) => {
    try {
        // ✅ Update Business (if needed)
        await Business.findOneAndUpdate(
            { businessId },
            { $set: { businessId } },
            { new: true, upsert: true }
        );

        // ✅ Store all services in a **single document** instead of separate documents
        await Service.findOneAndUpdate(
            { businessId },
            { $set: { services: scrapedData.services.map(name => ({ name })) } }, // Convert array of strings to array of objects
            { new: true, upsert: true }
        );

        // ✅ Store Contact Information
        await Contact.findOneAndUpdate(
            { businessId },
            { $set: scrapedData.contactDetails },
            { new: true, upsert: true }
        );

        // ✅ Store FAQs inside ExtraInfo collection
        await FAQ.findOneAndUpdate(
            { businessId },
            { $set: { faqs: scrapedData.faqs } }, // Store FAQs as an array inside one document
            { new: true, upsert: true }
        );

        console.log("✅ Data successfully stored in MongoDB");

    } catch (error) {
        console.error("❌ Error saving data to MongoDB:", error);
    }
};

export default saveScrapedData;
