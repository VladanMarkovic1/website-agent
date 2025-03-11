import express from 'express';
import { sendInstantConfirmation } from '../utils/emailService.js';

const router = express.Router();

// Only enable in development
if (process.env.NODE_ENV !== 'production') {
    // Test instant confirmation email
    router.post('/test-email', async (req, res) => {
        try {
            const testData = {
                name: "Test User",
                phone: "555-123-4567",
                email: req.body.email || "test@example.com", // Allow custom test email
                service: "Dental Implants"
            };

            const result = await sendInstantConfirmation(testData);
            
            res.json({
                success: true,
                message: "Test email sent successfully",
                previewUrl: result?.previewUrl,
                messageId: result?.messageId,
                testData
            });

        } catch (error) {
            console.error('Test email error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Test different services
    router.post('/test-email/:service', async (req, res) => {
        try {
            const services = [
                'Veneers',
                'Dental Implants',
                'Teeth Whitening',
                'Root Canal',
                'Braces & Aligners',
                'Wisdom Tooth Extraction',
                'Dental Cleaning',
                'Pediatric Dentistry'
            ];

            const service = req.params.service;
            if (!services.includes(service)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid service',
                    validServices: services
                });
            }

            const testData = {
                name: req.body.name || "Test User",
                phone: req.body.phone || "555-123-4567",
                email: req.body.email || "test@example.com",
                service: service
            };

            const result = await sendInstantConfirmation(testData);
            
            res.json({
                success: true,
                message: `Test email sent for ${service}`,
                previewUrl: result?.previewUrl,
                messageId: result?.messageId,
                testData
            });

        } catch (error) {
            console.error('Test email error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
}

export default router; 