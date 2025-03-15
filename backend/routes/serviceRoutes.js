import express from 'express';
import { updateBusinessServices } from '../serviceControllers/serviceController.js';

const router = express.Router();

console.log("✅ Service Routes Initialized");

router.put('/:businessId', (req, res) => {
    console.log(`🔹 PUT Request Received for businessId: ${req.params.businessId}`);
    updateBusinessServices(req, res);
});

export default router;
