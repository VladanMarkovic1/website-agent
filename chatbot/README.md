# Dental Chatbot Widget

A customizable chatbot widget for dental websites that provides real-time chat functionality with AI assistance.

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build:widget
```

## Integration

Add the following code to your website:

```html
<!-- Chatbot Configuration -->
<script>
    window.DENTAL_CHATBOT_CONFIG = {
        businessId: 'YOUR_BUSINESS_ID',
        position: 'bottom-right', // or 'bottom-left', 'top-right', 'top-left'
        buttonText: 'Chat with us',
        primaryColor: '#4F46E5'
    };
</script>

<!-- Chatbot Loader Script -->
<script src="YOUR_CHATBOT_URL/loader.min.js"></script>
```

## Configuration Options

- `businessId` (required): Your unique business identifier
- `position`: Widget position (default: 'bottom-right')
- `buttonText`: Custom button text (default: 'Chat with us')
- `primaryColor`: Custom theme color (default: '#4F46E5')

## Features

- Real-time chat functionality
- AI-powered responses
- Customizable appearance
- Responsive design
- Message history
- Markdown support
- Loading indicators
- Error handling

## Development Notes

- Built with React and Vite
- Uses Socket.io for real-time communication
- Styled with Tailwind CSS
- Supports markdown rendering
- Includes build process for distribution 