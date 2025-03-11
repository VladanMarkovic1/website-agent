import Business from "../models/Business.js";
import Selectors from "../models/Selector.js";
import  scrapeBusinessData  from "../scraper/scraper.js";

export const scrapeBusiness = async (req, res) => {
    const { businessId } = req.params;

    try {
        console.log(`🔍 Looking for business: ${businessId}`);
        const business = await Business.findOne({ businessId }).lean();

        if (!business) {
            return res.status(404).json({ message: `Business ${businessId} not found` });
        }

        console.log(`✅ Business Found: ${business.businessName}`);

        // Fetch selectors separately (do NOT use populate)
        const selectors = await Selectors.findOne({ businessId }).lean();

        if (!selectors) {
            return res.status(404).json({ message: `Selectors for ${businessId} not found` });
        }

        console.log(`📌 Selectors Loaded:`, selectors);

        // Attach selectors to business
        business.selectors = selectors;

        // Start Scraping
        await scrapeBusinessData(business);
        res.json({ message: `Scraping started for ${business.businessName}` });

    } catch (error) {
        console.error(`❌ Scraping Controller Error:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
