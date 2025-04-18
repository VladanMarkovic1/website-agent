import Business from '../../models/Business.js';
import mongoose from 'mongoose'; // Needed for ObjectId validation

// --- Controller Functions for Business/Client Management ---

// GET /api/v1/clients - Fetch all businesses (basic info)
export const getAllClients = async (req, res) => {
    try {
        // Selecting specific fields might be good for performance
        const clients = await Business.find({}, 'businessId businessName isActive allowedOrigins createdAt').lean();
        res.status(200).json({ success: true, count: clients.length, data: clients });
    } catch (error) {
        console.error("Error fetching all clients:", error);
        res.status(500).json({ success: false, error: "Failed to fetch clients" });
    }
};

// GET /api/v1/clients/:clientId - Fetch a single client by its DB ID (_id) or businessId
export const getClientById = async (req, res) => {
    const { clientId } = req.params; 
    try {
        // Determine if clientId is a likely ObjectId or a businessId slug/string
        const isObjectId = mongoose.Types.ObjectId.isValid(clientId);
        const query = isObjectId ? { _id: clientId } : { businessId: clientId };

        const client = await Business.findOne(query).lean(); // Add .populate() if needed later

        if (!client) {
            return res.status(404).json({ success: false, error: "Client not found" });
        }
        res.status(200).json({ success: true, data: client });
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        res.status(500).json({ success: false, error: "Failed to fetch client" });
    }
};

// POST /api/v1/clients - Create a new business/client
export const createClient = async (req, res) => {
    // Expected body: { businessName: '...', allowedOrigins: ['...'] }
    // businessId might be auto-generated or derived from name/other logic
    try {
        const { businessName, allowedOrigins } = req.body;

        if (!businessName || !Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
             return res.status(400).json({ success: false, error: "Business name and at least one allowed origin are required." });
        }
        
        // TODO: Generate a unique businessId (e.g., based on name, or use a library like cuid/slugify)
        // For now, let's use a simple slugified name + random suffix
        const generatedBusinessId = businessName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);

        // Check if businessId already exists (important!)
        const existing = await Business.findOne({ businessId: generatedBusinessId });
        if (existing) {
             // Handle collision - maybe retry generation or return error
             return res.status(409).json({ success: false, error: "Generated Business ID collision, please try again." });
        }

        const newClient = new Business({
            businessId: generatedBusinessId,
            businessName,
            allowedOrigins,
            isActive: true // Default to active
            // Add other default fields as necessary
        });

        await newClient.save();
        res.status(201).json({ success: true, message: "Client created successfully", data: newClient });

    } catch (error) {
        console.error("Error creating client:", error);
         if (error.code === 11000) { // Duplicate key error (e.g., if businessId wasn't unique despite check)
             return res.status(409).json({ success: false, error: "A client with this identifier might already exist." });
        }
        res.status(500).json({ success: false, error: "Failed to create client" });
    }
};

// PUT /api/v1/clients/:clientId - Update a client
export const updateClient = async (req, res) => {
    const { clientId } = req.params;
    // Expected body: fields to update, e.g., { businessName: '...', allowedOrigins: ['...'], isActive: ... }
    try {
         // Determine if clientId is a likely ObjectId or a businessId slug/string
        const isObjectId = mongoose.Types.ObjectId.isValid(clientId);
        const query = isObjectId ? { _id: clientId } : { businessId: clientId };

        // Ensure businessId is not updated
        const { businessId, ...updateData } = req.body; 

        const updatedClient = await Business.findOneAndUpdate(
            query, 
            updateData, 
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedClient) {
            return res.status(404).json({ success: false, error: "Client not found" });
        }
        res.status(200).json({ success: true, message: "Client updated successfully", data: updatedClient });

    } catch (error) {
        console.error(`Error updating client ${clientId}:`, error);
        res.status(500).json({ success: false, error: "Failed to update client" });
    }
};

// DELETE /api/v1/clients/:clientId - Delete a client
export const deleteClient = async (req, res) => {
    const { clientId } = req.params;
    try {
         // Determine if clientId is a likely ObjectId or a businessId slug/string
        const isObjectId = mongoose.Types.ObjectId.isValid(clientId);
        const query = isObjectId ? { _id: clientId } : { businessId: clientId };

        const deletedClient = await Business.findOneAndDelete(query);

        if (!deletedClient) {
            return res.status(404).json({ success: false, error: "Client not found" });
        }
        // TODO: Consider cleanup logic - delete associated Leads, Services, Analytics etc.? This can be complex.
        res.status(200).json({ success: true, message: "Client deleted successfully", data: {} }); // Or return deletedClient

    } catch (error) {
        console.error(`Error deleting client ${clientId}:`, error);
        res.status(500).json({ success: false, error: "Failed to delete client" });
    }
}; 