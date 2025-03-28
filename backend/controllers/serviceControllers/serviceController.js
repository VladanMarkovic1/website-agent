import Service from "../../models/Service.js";

export const getBusinessServices = async (req, res) => {
    try {
        // Use the business object that was attached by checkBusinessOwner middleware
        const business = req.business;
        
        if (!business) {
            return res.status(404).json({ error: "Business not found." });
        }

        // Get services
        const serviceDoc = await Service.findOne({ businessId: business.businessId });
        console.log(`Fetching services for business ${business.businessId}`);
        
        // Return empty array if no services exist yet
        return res.status(200).json(serviceDoc ? serviceDoc.services : []);
    } catch (error) {
        console.error('Error fetching business services:', error);
        return res.status(500).json({ error: 'Failed to fetch business services' });
    }
};

export const updateBusinessServices = async (req, res) => {
    try {
        // Use the business object that was attached by checkBusinessOwner middleware
        const business = req.business;
        const { services } = req.body;

        if (!business) {
            return res.status(404).json({ error: "Business not found." });
        }

        console.log(`🔹 Updating services for business: ${business.businessId}`);
        console.log(`🔹 Services Data:`, services);

        // Find or create services document
        let serviceDoc = await Service.findOne({ businessId: business.businessId });
        if (!serviceDoc) {
            serviceDoc = new Service({ businessId: business.businessId, services: [] });
        }

        // Update services
        serviceDoc.services = services;

        // Save changes
        await serviceDoc.save();

        console.log(`✅ Services Updated Successfully:`, serviceDoc);
        res.status(200).json({
            message: "Services updated successfully!",
            services: serviceDoc.services,
        });

    } catch (error) {
        console.error(`❌ Error updating services:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
};
