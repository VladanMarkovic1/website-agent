import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendLeadNotification = async (businessEmail, leadData) => {
    if (!businessEmail) {
        return;
    }

    const {
        name,
        phone,
        email,
        service,
        reason,
        details
    } = leadData;

    // Format details into a readable string
    const detailsString = details ? Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n') : 'No additional details';

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: businessEmail,
        subject: `New Lead Alert: ${name} - ${service}`,
        text: `
New Lead Details:
----------------
Name: ${name}
Phone: ${phone}
Email: ${email || 'Not provided'}
Service: ${service}
Reason: ${reason}

Additional Details:
-----------------
${detailsString}
        `,
        html: `
<h2>New Lead Details</h2>
<table style="border-collapse: collapse; width: 100%;">
    <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
    </tr>
    <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${phone}</td>
    </tr>
    <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${email || 'Not provided'}</td>
    </tr>
    <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Service:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${service}</td>
    </tr>
    <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${reason}</td>
    </tr>
</table>

<h3>Additional Details</h3>
<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
${detailsString}
</pre>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        // Don't throw the error - we don't want to break the lead saving process
    }
}; 