import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import Business from "../../models/Business.js"; // Import Business model
import Contact from "../../models/Contact.js"; // Import Contact model

dotenv.config();

let transporter = null;

// Initialize transporter with Ethereal account
async function createTransporter() {
    if (!transporter) {
        // Create Ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        console.log('Test Account:', testAccount);

        // Create reusable transporter
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }
    return transporter;
}

// Send instant confirmation email
export const sendInstantConfirmation = async (leadData) => {
    try {
        // Log the received data
        console.log('Sending confirmation email to:', leadData.email);

        const transport = await createTransporter();

        const currentHour = new Date().getHours();
        const isDuringBusinessHours = currentHour >= 9 && currentHour < 17;
        
        const businessHours = isDuringBusinessHours 
            ? " very shortly"
            : " during our business hours (9 AM - 5 PM)";

        const mailOptions = {
            from: '"Dental Website" <test@dental.com>',
            to: leadData.email,
            subject: `Thank You for Your Interest in ${leadData.service}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Thank you for choosing Revive Dental!</h2>
                    <p>Dear ${leadData.name},</p>
                    <p>We've received your inquiry about ${leadData.service}. Our team will call you shortly at ${leadData.phone} to discuss your needs.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p><strong>Your Contact Information:</strong></p>
                        <ul style="list-style: none; padding-left: 0;">
                            <li>Name: ${leadData.name}</li>
                            <li>Phone: ${leadData.phone}</li>
                            <li>Service Interest: ${leadData.service}</li>
                        </ul>
                    </div>

                    <p><strong>What to Expect:</strong></p>
                    <ul>
                        <li>Our team will call you${businessHours}</li>
                        <li>We'll discuss your specific needs and answer any questions</li>
                        <li>We'll help schedule your consultation at a convenient time</li>
                    </ul>

                    <p>If you need immediate assistance, please call us at: <strong>${process.env.BUSINESS_PHONE || '1-800-DENTAL'}</strong></p>
                    <br>
                    <p>Best regards,</p>
                    <p>The Revive Dental Team</p>
                </div>
            `
        };

        const info = await transport.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', previewUrl);
        return { info, previewUrl };

    } catch (error) {
        console.error('❌ Error sending confirmation email:', error);
        throw error;
    }
};

// Email templates
const emailTemplates = {
    initialFollowUp: {
        subject: 'Thank You for Your Interest in {{service}}',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Thank you for choosing Revive Dental!</h2>
                <p>Dear {{name}},</p>
                <p>Thank you for your interest in our {{service}} service. We're excited to help you achieve your dental goals!</p>
                <p>Here's what you can expect during your consultation:</p>
                <ul>
                    <li>A thorough evaluation of your dental needs</li>
                    <li>Detailed discussion of your {{service}} treatment plan</li>
                    <li>Review of financing options starting at $199/month</li>
                    <li>Answers to all your questions about the procedure</li>
                </ul>
                <p>Our team will contact you shortly at {{phone}} to schedule your consultation.</p>
                <p>If you'd like to reach us immediately, please call: <strong>{{businessPhone}}</strong></p>
                <br>
                <p>Best regards,</p>
                <p>The Revive Dental Team</p>
            </div>
        `
    },
    reminderEmail: {
        subject: 'Your {{service}} Consultation at Revive Dental',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Your Consultation is Coming Up!</h2>
                <p>Dear {{name}},</p>
                <p>This is a friendly reminder about your interest in our {{service}} service.</p>
                <p>We still have a few preferred consultation slots available this week, and we'd love to help you get started on your journey to a better smile.</p>
                <p>Key benefits of our {{service}}:</p>
                <ul>
                    <li>{{benefits}}</li>
                    <li>Flexible payment plans starting at $199/month</li>
                    <li>Expert care from our experienced team</li>
                </ul>
                <p>Ready to schedule? Call us at: <strong>{{businessPhone}}</strong></p>
                <br>
                <p>Best regards,</p>
                <p>The Revive Dental Team</p>
            </div>
        `
    }
};

// Send follow-up email - ADD businessId parameter
export const sendFollowUpEmail = async (businessId, emailType, recipientData) => { 
    try {
        if (!businessId) {
            throw new Error('Business ID is required to send follow-up email');
        }

        // Fetch business-specific contact info
        const contactData = await Contact.findOne({ businessId });
        const businessPhone = contactData?.phone || process.env.BUSINESS_PHONE || 'the office'; // Fallback
        // Fetch Business name if needed for templates
        // const businessData = await Business.findOne({ businessId });
        // const businessName = businessData?.businessName || 'the office';

        const template = emailTemplates[emailType];
        if (!template) throw new Error('Email template not found');

        // Replace placeholders in template
        let subject = template.subject;
        let html = template.html;
        
        // Merge recipient data and business data for replacement
        const templateData = {
            ...recipientData,
            businessPhone: businessPhone,
            // businessName: businessName 
        };

        Object.keys(templateData).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(placeholder, templateData[key]);
            html = html.replace(placeholder, templateData[key]);
        });

        const mailOptions = {
            // Use business email or fallback if defined
            from: contactData?.email || process.env.EMAIL_USER, 
            to: recipientData.email,
            subject: subject,
            html: html
        };

        const transport = await createTransporter(); // Ensure transporter is ready
        const info = await transport.sendMail(mailOptions);
        console.log('✅ Follow-up email sent:', info.messageId);
        return info;

    } catch (error) {
        console.error('❌ Error sending follow-up email:', error);
        throw error;
    }
};

// Schedule and send reminder emails
export const scheduleReminderEmails = async (leadData) => {
    try {
        if (!leadData || !leadData.businessId) {
             console.error('❌ Cannot schedule emails: businessId missing from leadData');
             return; // Or throw error
        }
        const businessId = leadData.businessId;

        // Fetch business phone here to pass to sendFollowUpEmail
        const contactData = await Contact.findOne({ businessId });
        const businessPhone = contactData?.phone || process.env.BUSINESS_PHONE || 'the office';

        // Send initial follow-up immediately - Pass businessId
        await sendFollowUpEmail(businessId, 'initialFollowUp', {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            service: leadData.service,
            businessPhone: businessPhone // Pass the specific phone
        });

        // Schedule reminder email for 24 hours later if no response - Pass businessId
        setTimeout(async () => {
            // Re-fetch business phone in case it changed? Or assume it's stable.
             const currentContactData = await Contact.findOne({ businessId });
             const currentBusinessPhone = currentContactData?.phone || process.env.BUSINESS_PHONE || 'the office';
            await sendFollowUpEmail(businessId, 'reminderEmail', {
                name: leadData.name,
                email: leadData.email,
                service: leadData.service,
                benefits: getServiceBenefits(leadData.service),
                businessPhone: currentBusinessPhone // Pass the specific phone
            });
        }, 24 * 60 * 60 * 1000); // 24 hours

    } catch (error) {
        console.error('❌ Error in email scheduling:', error);
        throw error;
    }
};

// Helper function to get service benefits
function getServiceBenefits(service) {
    const benefits = {
        'Veneers': 'Custom-designed for your smile, natural-looking results',
        'Dental Implants': 'Permanent solution for missing teeth, restored functionality',
        'Teeth Whitening': 'Professional-grade whitening, lasting results',
        'Root Canal': 'Pain relief and tooth preservation',
        'Braces & Aligners': 'Straighter teeth and improved bite alignment',
        'Wisdom Tooth Extraction': 'Prevention of future dental issues',
        'Dental Cleaning': 'Improved oral health and cavity prevention',
        'Pediatric Dentistry': 'Child-friendly care for developing smiles'
    };
    return benefits[service] || 'Exceptional dental care with proven results';
}

export const testEmail = async (req, res) => {
    try {
        // Get service from request body
        const service = req.body.service;
        
        // Log the service value immediately
        console.log('1. Service from request:', service);

        const testData = {
            name: "Test User",
            phone: "555-123-4567",
            email: req.body.email || "test@example.com",
            service: service
        };

        // Log the testData before sending
        console.log('2. testData before sending:', JSON.stringify(testData, null, 2));

        // Send the email
        const result = await sendInstantConfirmation(testData);
        
        // Log the testData after sending
        console.log('3. testData after sending:', JSON.stringify(testData, null, 2));

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