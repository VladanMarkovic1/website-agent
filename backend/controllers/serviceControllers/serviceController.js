import Service from "../../models/Service.js";

export const getBusinessServices = async (req, res) => {
    try {
        // Get businessId from params
        const { businessId } = req.params;
        // const business = req.business; // Keep if needed for other checks
        
        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required in URL" });
        }

        // Get services using businessId from params
        const serviceDoc = await Service.findOne({ businessId: businessId });
        console.log(`Fetching services for business ${businessId}`);
        
        // Return empty array if no services exist yet
        return res.status(200).json(serviceDoc ? serviceDoc.services : []);
    } catch (error) {
        console.error('Error fetching business services:', error);
        return res.status(500).json({ error: 'Failed to fetch business services' });
    }
};

export const updateBusinessServices = async (req, res) => {
    try {
        // Get businessId from params
        const { businessId } = req.params;
        const { services } = req.body;
        // const business = req.business; // Keep if needed for other checks

        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required in URL" });
        }

        console.log(`🔹 Updating services for business: ${businessId}`);
        console.log(`🔹 Services Data:`, services);

        // Find or create services document using businessId from params
        let serviceDoc = await Service.findOne({ businessId: businessId });
        if (!serviceDoc) {
            serviceDoc = new Service({ businessId: businessId, services: [] });
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
