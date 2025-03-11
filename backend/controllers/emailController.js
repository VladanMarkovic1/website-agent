import { sendInstantConfirmation } from '../utils/emailService.js';

export const testEmail = async (req, res) => {
    try {
        const testData = {
            name: "Test User",
            phone: "555-123-4567",
            email: req.body.email || "test@example.com",
            service: "Dental Implants"
        };

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