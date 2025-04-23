import Lead from "../../models/Lead.js";

/**
 * Express route handler for updating a lead by ID.
 */
export const updateLead = async (req, res) => {
    try {
        const { leadId } = req.params;
        const updateData = req.body;

        // Find the lead first
        const lead = await Lead.findById(leadId);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Define allowed fields to prevent mass assignment vulnerabilities
        const allowedUpdates = [
            'name', 'phone', 'email', 'service', 'reason', 'status', 
            'bestTimeToCall', 'scheduledConsultation', 'notes', 
            // Add other fields that are permitted to be updated via this route
            // Be careful about nested objects - you might need markModified
        ]; 
        
        // Apply updates from request body to the Mongoose document
        for (const key in updateData) {
            if (allowedUpdates.includes(key)) {
                // Check if the key is actually part of the schema
                if (lead.schema.path(key)) { 
                   lead[key] = updateData[key];
                } else if (key === 'notes' && lead.scheduledConsultation) { 
                    // Handle nested 'notes' within scheduledConsultation if needed
                    lead.scheduledConsultation.notes = updateData[key];
                    lead.markModified('scheduledConsultation'); // Important for nested objects
                } else {
                    console.warn(`[Update Lead] Attempted to update non-existent or non-allowed field: ${key}`);
                }
            }
        }

        // Explicitly mark modified for complex nested fields if direct assignment doesn't work reliably
        if (updateData.scheduledConsultation && typeof updateData.scheduledConsultation === 'object') {
             // Update nested fields carefully, e.g.:
             // if (updateData.scheduledConsultation.date) lead.scheduledConsultation.date = updateData.scheduledConsultation.date;
             // if (updateData.scheduledConsultation.confirmed != null) lead.scheduledConsultation.confirmed = updateData.scheduledConsultation.confirmed;
             // ... update other nested fields ...
             lead.markModified('scheduledConsultation');
        }

        // Save the document, triggering the pre('save') hook for encryption
        const updatedLead = await lead.save();

        // Return the updated lead. Thanks to `toJSON: { virtuals: true }`,
        // this JSON response should include decryptedName, decryptedEmail, decryptedPhone.
        res.status(200).json(updatedLead); 

    } catch (error) {
        console.error("Error updating lead:", error);
         if (error.name === 'ValidationError') {
             res.status(400).json({ error: `Validation failed: ${error.message}` });
         } else {
             res.status(500).json({ error: 'Failed to update lead' });
         }
    }
}; 