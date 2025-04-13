# Dental Practice Chatbot

An AI-powered chatbot specifically designed for dental practices to handle patient inquiries, appointment scheduling, and provide dental care information.

## Installation

To add the chatbot to your dental practice website, add the following code just before the closing `</body>` tag of your website:

```html
<!-- Dental Chatbot Configuration -->
<script>
  window.DENTAL_CHATBOT_CONFIG = {
    businessId: 'YOUR_BUSINESS_ID', // Replace with your business ID
    position: 'bottom-right',       // Options: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    buttonText: 'Chat with us',     // Customize the chat button text
    primaryColor: '#4F46E5',        // Customize the primary color (hex code)
    backendUrl: 'YOUR_BACKEND_URL'  // Replace with your backend URL
  };
</script>

<!-- Load chatbot styles -->
<link rel="stylesheet" href="YOUR_CHATBOT_HOST/dental-chatbot.css">

<!-- Load chatbot script -->
<script src="YOUR_CHATBOT_HOST/dental-chatbot.js"></script>
```

Replace the following placeholders:
- `YOUR_BUSINESS_ID`: Your unique business identifier provided during registration
- `YOUR_BACKEND_URL`: The URL where your chatbot backend is hosted
- `YOUR_CHATBOT_HOST`: The URL where your chatbot assets are hosted

## Customization Options

### Position
Control where the chat widget appears on your website:
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

### Button Text
Customize the text that appears on the chat button before it's opened.

### Primary Color
Set your brand color using a hex code (e.g., '#4F46E5' for indigo).

## Features

- 24/7 automated patient support
- Appointment scheduling assistance
- Dental care information and FAQ handling
- Emergency case prioritization
- Multi-language support
- Secure patient data handling
- Custom branding options
- Analytics and insights

## Security & Privacy

- All communications are encrypted
- Compliant with healthcare data protection regulations
- No sensitive patient information is stored in chat logs
- Regular security audits and updates

## Support

For support or questions, please contact our team at [your-support-email].

## License

© 2024 Your Company Name. All rights reserved. 