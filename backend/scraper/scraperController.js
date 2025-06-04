console.log("🔄 IMPORTING BUSINESS MODEL...");
import Business from "../models/Business.js";
console.log("✅ BUSINESS MODEL IMPORTED");
console.log("🔄 IMPORTING SELECTORS MODEL...");
import Selectors from "../models/Selector.js";
console.log("✅ SELECTORS MODEL IMPORTED");
console.log("🔄 IMPORTING SCRAPE BUSINESS DATA...");
import  scrapeBusinessData  from "./scraper.js";
console.log("✅ SCRAPE BUSINESS DATA IMPORTED");

export const scrapeBusiness = async (req, res) => {
    console.log("🚀 SCRAPE BUSINESS CONTROLLER CALLED");
    console.log("📋 REQUEST PARAMS:", req.params);
    console.log("📋 REQUEST BODY:", req.body);
    console.log("📋 REQUEST HEADERS:", req.headers);
    
    const { businessId } = req.params;
    console.log("🔍 BUSINESS ID:", businessId);

    try {
        console.log(`🔄 LOOKING FOR BUSINESS: ${businessId}`);
        const business = await Business.findOne({ businessId }).lean();
        console.log("✅ BUSINESS DATABASE QUERY COMPLETED");

        if (!business) {
            console.log(`❌ BUSINESS ${businessId} NOT FOUND`);
            return res.status(404).json({ message: `Business ${businessId} not found` });
        }

        console.log(`✅ BUSINESS FOUND: ${business.businessName}`);
        console.log("📊 BUSINESS DATA:", JSON.stringify(business, null, 2));

        // Fetch selectors separately (do NOT use populate)
        console.log(`🔄 LOOKING FOR SELECTORS FOR BUSINESS: ${businessId}`);
        const selectors = await Selectors.findOne({ businessId }).lean();
        console.log("✅ SELECTORS DATABASE QUERY COMPLETED");

        if (!selectors) {
            console.log(`❌ SELECTORS FOR ${businessId} NOT FOUND`);
            return res.status(404).json({ message: `Selectors for ${businessId} not found` });
        }

        console.log(`✅ SELECTORS FOUND FOR: ${businessId}`);
        console.log("📊 SELECTORS DATA:", JSON.stringify(selectors, null, 2));

        // Attach selectors to business
        console.log("🔄 ATTACHING SELECTORS TO BUSINESS OBJECT...");
        business.selectors = selectors;
        console.log("✅ SELECTORS ATTACHED TO BUSINESS");

        // Start Scraping
        console.log("🔄 STARTING SCRAPING PROCESS...");
        console.log("📊 FINAL BUSINESS OBJECT FOR SCRAPING:", JSON.stringify(business, null, 2));
        
        await scrapeBusinessData(business);
        console.log("✅ SCRAPING PROCESS COMPLETED SUCCESSFULLY");
        
        console.log("🔄 SENDING SUCCESS RESPONSE...");
        res.json({ message: `Scraping started for ${business.businessName}` });
        console.log("✅ SUCCESS RESPONSE SENT");

    } catch (error) {
        console.error(`🚨 SCRAPING CONTROLLER ERROR:`, error);
        console.error(`🚨 SCRAPING CONTROLLER ERROR STACK:`, error.stack);
        console.log("🔄 SENDING ERROR RESPONSE...");
        res.status(500).json({ message: "Internal server error" });
        console.log("✅ ERROR RESPONSE SENT");
    }
};

console.log("✅ SCRAPER CONTROLLER MODULE LOADED");
