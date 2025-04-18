import Lead from "../../models/Lead.js";

/**
 * Express route handler for updating the status of a lead.
 */
export const updateLeadStatus = async (req, res) => {
    try {
        // Get businessId and leadId from parameters
        const { businessId, leadId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        if (!businessId || !leadId) {
            return res.status(400).json({ error: 'Business ID and Lead ID are required in URL' });
        }

        // Find the lead specifically for this business
        const lead = await Lead.findOne({ _id: leadId, businessId: businessId });
        
        if (!lead) {
            // Lead not found OR belongs to a different business
            return res.status(404).json({ error: 'Lead not found for this business' });
        }

        lead.status = status;
        // Optionally add who made the change if req.user is available
        lead.interactions.push({ 
            type: 'Status Update', 
            content: `Status changed to ${status}`, 
            timestamp: new Date()
            // userId: req.user?.id // Example if user info is attached by auth middleware
        });
        await lead.save();

        res.status(200).json(lead);
    } catch (error) {
        console.error("Error updating lead status:", error);
        res.status(500).json({ error: 'Failed to update lead status' });
    }
}; 