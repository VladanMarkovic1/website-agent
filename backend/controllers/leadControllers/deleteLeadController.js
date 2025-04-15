import Lead from "../../models/Lead.js";

/**
 * Express route handler for deleting a lead by ID.
 */
export const deleteLead = async (req, res) => {
    try {
        const { leadId } = req.params;

        const deletedLead = await Lead.findByIdAndDelete(leadId);

        if (!deletedLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.status(200).json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error("Error deleting lead:", error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
}; 