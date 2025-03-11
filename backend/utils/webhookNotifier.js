//import axios from "axios";

/**
 * Send a webhook notification when a business updates services
 */
/*
export const sendServiceUpdateWebhook = async (businessId, services) => {
    const webhookURL = process.env.WEBHOOK_URL || "https://your-business-webhook.com/update";

    try {
        await axios.post(webhookURL, {
            businessId,
            updatedServices: services,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Webhook sent for business ${businessId}`);
    } catch (error) {
        console.error("❌ Webhook failed:", error.response?.data || error.message);
    }
};
*/