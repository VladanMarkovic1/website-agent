import express from 'express';
import { testEmail } from '../controllers/emailController.js';

const router = express.Router();

// Only enable in development
if (process.env.NODE_ENV !== 'production') {
    // Single route for test emails
    router.post('/test-email', async (req, res) => {
        try {
            await testEmail(req, res);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
}

export default router; 