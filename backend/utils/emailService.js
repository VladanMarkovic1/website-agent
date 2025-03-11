import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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

// Send follow-up email
export const sendFollowUpEmail = async (emailType, recipientData) => {
    try {
        const template = emailTemplates[emailType];
        if (!template) throw new Error('Email template not found');

        // Replace placeholders in template
        let subject = template.subject;
        let html = template.html;
        
        Object.keys(recipientData).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(placeholder, recipientData[key]);
            html = html.replace(placeholder, recipientData[key]);
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientData.email,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
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
        // Send initial follow-up immediately
        await sendFollowUpEmail('initialFollowUp', {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            service: leadData.service,
            businessPhone: process.env.BUSINESS_PHONE || '1-800-DENTAL'
        });

        // Schedule reminder email for 24 hours later if no response
        setTimeout(async () => {
            await sendFollowUpEmail('reminderEmail', {
                name: leadData.name,
                email: leadData.email,
                service: leadData.service,
                benefits: getServiceBenefits(leadData.service),
                businessPhone: process.env.BUSINESS_PHONE || '1-800-DENTAL'
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