import Business from '../../models/Business.js';
import ExtraInfo from '../../models/ExtraInfo.js';

// Controller to get widget settings
export const getWidgetSettings = async (req, res) => {
    const { clientId } = req.params; // clientId is the businessId here

    try {
        // The business object should already be attached by checkBusinessOwner middleware
        // If not, fetch it again (but ideally rely on middleware)
        const business = req.business || await Business.findOne({ businessId: clientId });

        if (!business) {
            return res.status(404).json({ error: 'Business not found.' });
        }

        // Return widgetConfig and language menu settings
        res.status(200).json({
            widgetConfig: business.widgetConfig || {},
            showLanguageMenu: business.showLanguageMenu || false,
            supportedLanguages: business.supportedLanguages || ['en']
        });

    } catch (error) {
        console.error(`Error fetching widget settings for ${clientId}:`, error);
        res.status(500).json({ error: 'Failed to fetch widget settings.' });
    }
};

// Controller to update widget settings
export const updateWidgetSettings = async (req, res) => {
    const { clientId } = req.params;
    const { widgetConfig } = req.body; // Expect an object like { primaryColor: '#...', position: '...' }

    if (!widgetConfig) {
        return res.status(400).json({ error: 'widgetConfig object is required in the request body.' });
    }

    try {
        // The business object should already be attached by checkBusinessOwner middleware
        const business = req.business || await Business.findOne({ businessId: clientId });

        if (!business) {
            return res.status(404).json({ error: 'Business not found.' });
        }

        // Update the widgetConfig field
        // Merge existing config with new values to allow partial updates
        business.widgetConfig = { 
            ...business.widgetConfig.toObject(), // Spread existing config
            ...widgetConfig // Overwrite with new values
        };

        const updatedBusiness = await business.save();

        res.status(200).json({ 
            message: 'Widget settings updated successfully.', 
            widgetConfig: updatedBusiness.widgetConfig 
        });

    } catch (error) {
        console.error(`Error updating widget settings for ${clientId}:`, error);
        // Handle potential validation errors from the model save
        if (error.name === 'ValidationError') {
             return res.status(400).json({ error: `Validation failed: ${error.message}` });
        }
        res.status(500).json({ error: 'Failed to update widget settings.' });
    }
};

// Controller to get business options (days, times, insurance)
export const getBusinessOptions = async (req, res) => {
    const { clientId } = req.params; // clientId is the businessId here
    try {
        const extraInfo = await ExtraInfo.findOne({ businessId: clientId });
        if (!extraInfo) {
            return res.status(404).json({ error: 'Business extra info not found.' });
        }
        res.status(200).json({
            availableDays: extraInfo.availableDays || [],
            availableTimes: extraInfo.availableTimes || [],
            insuranceOptions: extraInfo.insuranceOptions || []
        });
    } catch (error) {
        console.error(`Error fetching business options for ${clientId}:`, error);
        res.status(500).json({ error: 'Failed to fetch business options.' });
    }
};

// Controller to get featured services for chatbot
export const getFeaturedServices = async (req, res) => {
    const { clientId } = req.params; // businessId
    try {
        const extraInfo = await ExtraInfo.findOne({ businessId: clientId });
        if (!extraInfo) {
            return res.status(200).json([]); // Return empty array if no featured services set
        }
        res.status(200).json(extraInfo.featuredServices || []);
    } catch (error) {
        console.error(`Error fetching featured services for ${clientId}:`, error);
        res.status(500).json({ error: 'Failed to fetch featured services.' });
    }
};

// Controller to update featured services for chatbot
export const updateFeaturedServices = async (req, res) => {
    const { clientId } = req.params; // businessId
    const { featuredServices } = req.body;
    if (!Array.isArray(featuredServices) || featuredServices.length > 7) {
        return res.status(400).json({ error: 'featuredServices must be an array with at most 7 items.' });
    }
    // Validate each item
    for (const fs of featuredServices) {
        if (!fs.originalName || !fs.displayName) {
            return res.status(400).json({ error: 'Each featured service must have originalName and displayName.' });
        }
    }
    try {
        const extraInfo = await ExtraInfo.findOneAndUpdate(
            { businessId: clientId },
            { $set: { featuredServices } },
            { new: true, upsert: true }
        );
        res.status(200).json({
            message: 'Featured services updated successfully.',
            featuredServices: extraInfo.featuredServices
        });
    } catch (error) {
        console.error(`Error updating featured services for ${clientId}:`, error);
        res.status(500).json({ error: 'Failed to update featured services.' });
    }
}; 