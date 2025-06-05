import Business from '../models/Business.js';
import Contact from '../models/Contact.js';
import Service from '../models/Service.js';
import FAQ from '../models/ExtraInfo.js';

const saveScrapedData = async (businessId, scrapedData) => {
    try {
        const businessResult = await Business.findOneAndUpdate(
            { businessId },
            { $set: { businessId } },
            { new: true, upsert: true }
        );

        const servicesObjects = scrapedData.services.map(name => ({ name }));
        
        const serviceResult = await Service.findOneAndUpdate(
            { businessId },
            { $set: { services: servicesObjects } },
            { new: true, upsert: true }
        );

        const contactResult = await Contact.findOneAndUpdate(
            { businessId },
            { $set: scrapedData.contactDetails },
            { new: true, upsert: true }
        );

        const faqResult = await FAQ.findOneAndUpdate(
            { businessId },
            { $set: { faqs: scrapedData.faqs } },
            { new: true, upsert: true }
        );

        console.log("Data successfully stored in MongoDB");

    } catch (error) {
        console.error("Error saving data to MongoDB:", error.message);
        throw error; // Re-throw to propagate the error
    }
};

export default saveScrapedData;
