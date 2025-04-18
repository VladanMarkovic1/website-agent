import express from 'express';
import {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
} from '../controllers/clientControllers/clientController.js';
import { authenticateToken } from '../middleware/auth.js';
// import { checkAdminRole } from '../middleware/checkAdminRole.js'; // TODO: Implement admin role check middleware

const router = express.Router();

// --- Client/Business Management Routes ---
// These routes should likely be protected and potentially restricted to admin users

// GET /api/v1/clients - Get all clients
router.get(
    '/', 
    authenticateToken, 
    // checkAdminRole, // Apply admin check
    getAllClients
);

// POST /api/v1/clients - Create a new client
router.post(
    '/', 
    authenticateToken, 
    // checkAdminRole,
    // TODO: Add validation middleware for request body
    createClient
);

// GET /api/v1/clients/:clientId - Get a single client by ID or businessId
router.get(
    '/:clientId',
    authenticateToken,
    // checkAdminRole,
    // TODO: Add validation for clientId parameter
    getClientById
);

// PUT /api/v1/clients/:clientId - Update a client
router.put(
    '/:clientId',
    authenticateToken,
    // checkAdminRole,
    // TODO: Add validation for clientId parameter and request body
    updateClient
);

// DELETE /api/v1/clients/:clientId - Delete a client
router.delete(
    '/:clientId',
    authenticateToken,
    // checkAdminRole,
    // TODO: Add validation for clientId parameter
    deleteClient
);

export default router; 