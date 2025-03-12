import { sendInstantConfirmation } from '../utils/emailService.js';

export const testEmail = async (req, res) => {
    try {
        // First, ensure we have a service
        if (!req.body.service) {
            return res.status(400).json({
                success: false,
                error: "Service is required"
            });
        }

        // Create the test data EXACTLY as received from the request
        const testData = {
            name: "Test User",
            phone: "555-123-4567",
            email: req.body.email || "test@example.com",
            service: req.body.service // This should preserve "Veneers" from the request
        };

        // Log to verify the data
        console.log('Sending to email service:', testData);

        const result = await sendInstantConfirmation(testData);
        
        res.json({
            success: true,
            message: "Test email sent successfully",
            previewUrl: result.previewUrl,
            messageId: result.info?.messageId,
            testData
        });

    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 