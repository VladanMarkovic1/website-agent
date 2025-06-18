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

        // Return the widgetConfig part
        res.status(200).json(business.widgetConfig || {}); 

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