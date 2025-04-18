import mongoose from 'mongoose';
import Lead from '../../models/Lead.js';

export const removeNoteFromLeadController = async (req, res) => {
    try {
        // Extract businessId, leadId, noteId from params
        const { businessId, leadId, noteId } = req.params;
        // const business = req.business; // Keep if needed, use businessId from params for query

        console.log('Removing note:', {
            leadId,
            noteId,
            // businessId: business._id
            businessId: businessId
        });

        if (!businessId || !leadId || !noteId) {
            return res.status(400).json({ error: 'Business ID, Lead ID, and Note ID are required in URL' });
        }

        let lead;
        try {
            // Use businessId from params in the query
            lead = await Lead.findOne({ 
                _id: new mongoose.Types.ObjectId(leadId), 
                businessId: businessId 
            });
        } catch (err) {
            if (err.name === 'CastError' || err.name === 'BSONError') {
                // Ensure correct status code for invalid ID format
                return res.status(400).json({ error: "Invalid Lead ID or Note ID format" }); 
            }
            throw err;
        }

        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }

        // Find and remove the note from callHistory
        const noteIndex = lead.callHistory.findIndex(note => note._id.toString() === noteId);
        
        if (noteIndex === -1) {
            return res.status(404).json({ error: "Note not found" });
        }

        // Remove the note
        lead.callHistory.splice(noteIndex, 1);
        await lead.save();
        
        console.log('Note removed successfully');
        res.status(200).json(lead);
    } catch (error) {
        console.error("Error removing note:", error);
        res.status(500).json({ error: "Failed to remove note: " + error.message });
    }
}; 