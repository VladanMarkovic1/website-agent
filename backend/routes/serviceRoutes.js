import express from 'express';
import { updateBusinessServices } from '../serviceControllers/serviceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';

const router = express.Router();

console.log("✅ Service Routes Initialized");

// Protect the route with JWT and check that the user owns the businessId
router.put('/:businessId', authenticateToken, checkBusinessOwner, (req, res) => {
    console.log(`🔹 PUT Request Received for businessId: ${req.params.businessId}`);
    updateBusinessServices(req, res);
});

export default router;

