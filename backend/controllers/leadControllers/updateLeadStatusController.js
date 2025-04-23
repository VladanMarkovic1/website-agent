import Lead from "../../models/Lead.js";
import { decrypt } from "../../utils/encryption.js"; // Import decrypt utility

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
            message: `Status changed to ${status}`, 
            timestamp: new Date()
            // userId: req.user?.id // Example if user info is attached by auth middleware
        });
        // Ensure lastContactedAt is updated on status change
        lead.lastContactedAt = new Date();
        await lead.save();

        // Re-fetch the lead to ensure getters are applied correctly for the response
        const updatedLead = await Lead.findById(lead._id);
        if (!updatedLead) {
            // Should ideally not happen if save succeeded, but handle defensively
            console.error(`[Update Status] Failed to re-fetch lead ${lead._id} after saving.`);
            return res.status(404).json({ error: 'Lead not found after update' });
        }

        // Manually decrypt fields before sending the response
        const leadToSend = { ...updatedLead.toObject() }; // Convert to plain object
        try {
            if (leadToSend.name && leadToSend.nameIv) {
                leadToSend.name = decrypt(leadToSend.name, leadToSend.nameIv);
            }
            if (leadToSend.phone && leadToSend.phoneIv) {
                leadToSend.phone = decrypt(leadToSend.phone, leadToSend.phoneIv);
            }
            if (leadToSend.email && leadToSend.emailIv) {
                leadToSend.email = decrypt(leadToSend.email, leadToSend.emailIv);
            }
        } catch (decryptionError) {
            console.error(`Error decrypting lead ${leadToSend._id} during status update:`, decryptionError);
            // Decide how to handle error: send partially decrypted, original encrypted, or error response?
            // Sending original encrypted might be safest for now to avoid broken data.
            // Alternatively, could return a specific error response.
        }

        // Send the potentially decrypted lead
        res.status(200).json(leadToSend);
    } catch (error) {
        console.error("Error updating lead status:", error);
        res.status(500).json({ error: 'Failed to update lead status' });
    }
}; 