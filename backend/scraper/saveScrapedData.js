console.log("🔄 IMPORTING MODELS FOR SAVE SCRAPED DATA...");
import Business from '../models/Business.js';
console.log("✅ BUSINESS MODEL IMPORTED");
import Contact from '../models/Contact.js';
console.log("✅ CONTACT MODEL IMPORTED");
import Service from '../models/Service.js';
console.log("✅ SERVICE MODEL IMPORTED");
import FAQ from '../models/ExtraInfo.js';
console.log("✅ FAQ/EXTRA INFO MODEL IMPORTED");
console.log("✅ ALL MODELS IMPORTED SUCCESSFULLY");

const saveScrapedData = async (businessId, scrapedData) => {
    console.log("🗄️ STARTING SAVE SCRAPED DATA FUNCTION");
    console.log("📋 BUSINESS ID:", businessId);
    console.log("📊 SCRAPED DATA:", JSON.stringify(scrapedData, null, 2));
    
    try {
        console.log("🔄 STEP 1: UPDATING/CREATING BUSINESS RECORD...");
        console.log("🔄 BUSINESS UPDATE QUERY:", { businessId });
        console.log("🔄 BUSINESS UPDATE DATA:", { $set: { businessId } });
        
        const businessResult = await Business.findOneAndUpdate(
            { businessId },
            { $set: { businessId } },
            { new: true, upsert: true }
        );
        console.log("✅ BUSINESS RECORD UPDATED/CREATED");
        console.log("📊 BUSINESS RESULT:", JSON.stringify(businessResult, null, 2));

        console.log("🔄 STEP 2: UPDATING/CREATING SERVICES RECORD...");
        console.log("📋 SERVICES DATA TO SAVE:", scrapedData.services);
        console.log("🔄 CONVERTING SERVICES TO OBJECT FORMAT...");
        const servicesObjects = scrapedData.services.map(name => ({ name }));
        console.log("📊 CONVERTED SERVICES:", servicesObjects);
        
        console.log("🔄 SERVICE UPDATE QUERY:", { businessId });
        console.log("🔄 SERVICE UPDATE DATA:", { $set: { services: servicesObjects } });
        
        const serviceResult = await Service.findOneAndUpdate(
            { businessId },
            { $set: { services: servicesObjects } },
            { new: true, upsert: true }
        );
        console.log("✅ SERVICES RECORD UPDATED/CREATED");
        console.log("📊 SERVICE RESULT:", JSON.stringify(serviceResult, null, 2));

        console.log("🔄 STEP 3: UPDATING/CREATING CONTACT RECORD...");
        console.log("📋 CONTACT DATA TO SAVE:", scrapedData.contactDetails);
        console.log("🔄 CONTACT UPDATE QUERY:", { businessId });
        console.log("🔄 CONTACT UPDATE DATA:", { $set: scrapedData.contactDetails });
        
        const contactResult = await Contact.findOneAndUpdate(
            { businessId },
            { $set: scrapedData.contactDetails },
            { new: true, upsert: true }
        );
        console.log("✅ CONTACT RECORD UPDATED/CREATED");
        console.log("📊 CONTACT RESULT:", JSON.stringify(contactResult, null, 2));

        console.log("🔄 STEP 4: UPDATING/CREATING FAQ RECORD...");
        console.log("📋 FAQ DATA TO SAVE:", scrapedData.faqs);
        console.log("🔄 FAQ UPDATE QUERY:", { businessId });
        console.log("🔄 FAQ UPDATE DATA:", { $set: { faqs: scrapedData.faqs } });
        
        const faqResult = await FAQ.findOneAndUpdate(
            { businessId },
            { $set: { faqs: scrapedData.faqs } },
            { new: true, upsert: true }
        );
        console.log("✅ FAQ RECORD UPDATED/CREATED");
        console.log("📊 FAQ RESULT:", JSON.stringify(faqResult, null, 2));

        console.log("🎉 ALL DATA SUCCESSFULLY STORED IN MONGODB");
        console.log("✅ SAVE SCRAPED DATA FUNCTION COMPLETED SUCCESSFULLY");

    } catch (error) {
        console.error("🚨 ERROR SAVING DATA TO MONGODB:", error.message);
        console.error("🚨 SAVE DATA ERROR STACK:", error.stack);
        console.error("🚨 SAVE DATA ERROR DETAILS:", {
            businessId,
            scrapedDataKeys: Object.keys(scrapedData),
            scrapedDataSizes: {
                services: scrapedData.services?.length || 0,
                contactDetails: Object.keys(scrapedData.contactDetails || {}).length,
                faqs: scrapedData.faqs?.length || 0
            }
        });
        throw error; // Re-throw to propagate the error
    }
};

console.log("✅ SAVE SCRAPED DATA FUNCTION DEFINED");

export default saveScrapedData;
