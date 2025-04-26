import mongoose from 'mongoose';
import Lead from '../../models/Lead.js';
import { decrypt } from "../../utils/encryption.js"; // Import decrypt utility

export const addNoteForLeadController = async (req, res) => {
    try {
        // Extract both businessId and leadId from params
        const { businessId, leadId } = req.params;
        const { note } = req.body;
        // const business = req.business; // Keep if needed for other checks, but use businessId from params for query
    
        // console.log('Adding note:', { /* ... */ }); // REMOVED

        if (!businessId || !leadId) {
            return res.status(400).json({ error: 'Business ID and Lead ID are required in URL' });
        }
    
        if (!note) {
          return res.status(400).json({ error: "Note content is required" });
        }
    
        let lead;
        try {
          // Use businessId from params in the query
          lead = await Lead.findOne({ 
            _id: new mongoose.Types.ObjectId(leadId), 
            businessId: businessId 
          });
        } catch (err) {
          // Handle invalid ObjectId format
          if (err.name === 'CastError' || err.name === 'BSONError') {
            return res.status(404).json({ error: "Invalid lead ID format" });
          }
          throw err; // Re-throw other errors
        }
    
        // console.log('Found lead:', lead ? 'yes' : 'no'); // REMOVED
        
        if (!lead) {
          return res.status(404).json({ error: "Lead not found" });
        }
    
        // Add the note to call history
        lead.callHistory.push({
          timestamp: new Date(),
          notes: note
        });
    
        await lead.save();
        // console.log('Note added successfully'); // REMOVED

        // Manually decrypt fields before sending the response
        const leadToSend = { ...lead.toObject() }; // Convert to plain object
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
            console.error(`Error decrypting lead ${leadToSend._id} after adding note:`, decryptionError);
            // Fallback to sending encrypted data on error
        }

        res.status(200).json(leadToSend);
      } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ error: "Failed to add note: " + error.message });
      }
};
