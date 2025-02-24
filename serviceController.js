import Service from "../models/Service.js";

export const updateBusinessServices = async (req, res) => {
    const { businessId } = req.params;
    const { services } = req.body;

    try {
        console.log(`🔹 PUT Request Received for businessId: ${businessId}`);
        console.log(`🔹 updateBusinessServices called`);
        console.log(`🔹 Business ID: ${businessId}`);
        console.log(`🔹 Services Data:`, services);

        // ✅ Find the existing services document
        let existingServices = await Service.findOne({ businessId });

        if (!existingServices) {
            // If no document exists, create a new one
            existingServices = new Service({ businessId, services: [] });
        }

        // ✅ Merge services (update existing & keep previous)
        services.forEach((newService) => {
            const index = existingServices.services.findIndex(
                (s) => s.name === newService.name
            );

            if (index !== -1) {
                // Update existing service
                existingServices.services[index] = {
                    ...existingServices.services[index],
                    ...newService,
                };
            } else {
                // Add new service
                existingServices.services.push(newService);
            }
        });

        // ✅ Save updated document
        await existingServices.save();

        console.log(`✅ Services Updated Successfully:`, existingServices);
        res.status(200).json({
            message: "Services updated successfully!",
            services: existingServices.services,
        });

    } catch (error) {
        console.error(`❌ Error updating services:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
