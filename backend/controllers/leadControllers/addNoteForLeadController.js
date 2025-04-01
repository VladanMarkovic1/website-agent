import mongoose from 'mongoose';
import Lead from '../../models/Lead.js';

export const addNoteForLeadController = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { note } = req.body;
        const business = req.business;
    
        console.log('Adding note:', {
          leadId,
          businessId: business._id,
          note,
          body: req.body
        });
    
        if (!note) {
          return res.status(400).json({ error: "Note content is required" });
        }
    
        let lead;
        try {
          lead = await Lead.findOne({ 
            _id: new mongoose.Types.ObjectId(leadId), 
            businessId: business.businessId 
          });
        } catch (err) {
          // Handle invalid ObjectId format
          if (err.name === 'CastError' || err.name === 'BSONError') {
            return res.status(404).json({ error: "Invalid lead ID format" });
          }
          throw err; // Re-throw other errors
        }
    
        console.log('Found lead:', lead ? 'yes' : 'no');
        
        if (!lead) {
          return res.status(404).json({ error: "Lead not found" });
        }
    
        // Add the note to call history
        lead.callHistory.push({
          timestamp: new Date(),
          notes: note
        });
    
        await lead.save();
        console.log('Note added successfully');
        res.status(200).json(lead);
      } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ error: "Failed to add note: " + error.message });
      }
};
