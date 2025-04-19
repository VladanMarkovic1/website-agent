import Business from '../../models/Business.js';

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