import mongoose from 'mongoose';
import Lead from '../../models/Lead.js';

export const removeNoteFromLeadController = async (req, res) => {
    try {
        const { leadId, noteId } = req.params;
        const business = req.business;

        console.log('Removing note:', {
            leadId,
            noteId,
            businessId: business._id
        });

        let lead;
        try {
            lead = await Lead.findOne({ 
                _id: new mongoose.Types.ObjectId(leadId), 
                businessId: business.businessId 
            });
        } catch (err) {
            if (err.name === 'CastError' || err.name === 'BSONError') {
                return res.status(404).json({ error: "Invalid lead ID format" });
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