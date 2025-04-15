import Lead from "../../models/Lead.js";

/**
 * Express route handler for updating a lead by ID.
 */
export const updateLead = async (req, res) => {
    try {
        const { leadId } = req.params;
        const updateData = req.body;

        const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, {
            new: true, // Return the updated document
            runValidators: true, // Ensure schema validation
        });

        if (!updatedLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.status(200).json(updatedLead);
    } catch (error) {
        console.error("Error updating lead:", error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
}; 