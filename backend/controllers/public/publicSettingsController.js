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
    const { businessId } = req.params;
    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required.' });
    }
    try {
        const extraInfo = await ExtraInfo.findOne({ businessId }).select('availableDays availableTimes');
        const serviceData = await Service.findOne({ businessId }).select('services');
        if (!extraInfo) {
            return res.status(404).json({ error: 'Options not found for this business ID.' });
        }
        const services = (serviceData?.services || []).map(s => ({ name: s.name, description: s.description }));
        res.status(200).json({
            availableDays: extraInfo.availableDays || [],
            availableTimes: extraInfo.availableTimes || [],
            services
        });
    } catch (error) {
        console.error(`Error fetching public business options for ${businessId}:`, error);
        res.status(500).json({ error: 'Failed to fetch business options.' });
    }
}; 