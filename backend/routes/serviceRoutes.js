import express from 'express';
import { updateBusinessServices, getBusinessServices } from '../controllers/serviceControllers/serviceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkBusinessOwner } from '../middleware/checkBusinessOwner.js';

const router = express.Router();

console.log("✅ Service Routes Initialized");

// GET business services
router.get('/:businessId', authenticateToken, checkBusinessOwner, (req, res) => {
    console.log(`🔹 GET Request Received for businessId: ${req.params.businessId}`);
    getBusinessServices(req, res);
});

// Update business services
router.put('/:businessId', authenticateToken, checkBusinessOwner, (req, res) => {
    console.log(`🔹 PUT Request Received for businessId: ${req.params.businessId}`);
    updateBusinessServices(req, res);
});

export default router;

