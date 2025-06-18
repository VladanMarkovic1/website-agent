import Business from '../../models/Business.js';
import ExtraInfo from '../../models/ExtraInfo.js';
import Service from '../../models/Service.js';

// Controller to get public widget settings (NO AUTH)
export const getPublicWidgetConfig = async (req, res) => {
    const { businessId } = req.params;

    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required.' });
    }

    try {
        const business = await Business.findOne({ businessId }).select('widgetConfig'); // Only select config

        if (!business) {
            return res.status(404).json({ error: 'Configuration not found for this business ID.' });
        }

        // Return only the widgetConfig
        res.status(200).json(business.widgetConfig || {});

    } catch (error) {
        console.error(`Error fetching public widget config for ${businessId}:`, error);
        res.status(500).json({ error: 'Failed to fetch widget configuration.' });
    }
};

// Controller to get public-safe business options (days, times, insurance)
export const getPublicBusinessOptions = async (req, res) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            return res.status(400).json({ error: "Business ID is required" });
        }

        // Fetch both ExtraInfo and Service data in parallel
        const [extraInfo, serviceData] = await Promise.all([
            ExtraInfo.findOne({ businessId }),
            Service.findOne({ businessId })
        ]);

        // Default values if no data found
        const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const defaultTimes = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

        // --- Featured services logic ---
        let allServices = serviceData?.services || [];
        let featuredServiceNames = extraInfo?.featuredServices || [];
        let featuredServices = [];
        if (featuredServiceNames.length > 0) {
            // Only include services that match the featured names (by name)
            featuredServices = allServices.filter(s => featuredServiceNames.includes(s.name));
        } else {
            // Fallback: first 6 services
            featuredServices = allServices.slice(0, 6);
        }
        // Always map to name/description objects
        featuredServices = featuredServices.map(service => ({
            name: service.name,
            description: service.description
        }));

        const response = {
            availableDays: extraInfo?.availableDays || defaultDays,
            availableTimes: extraInfo?.availableTimes || defaultTimes,
            services: featuredServices
        };

        res.json(response);
    } catch (error) {
        console.error("Error fetching public business options:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 