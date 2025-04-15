import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY;

if (!CHATBOT_API_KEY) {
  console.error('FATAL ERROR: CHATBOT_API_KEY is not defined in the environment variables.');
  // Optionally exit the process if the key is critical for startup
  // process.exit(1);
}

export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key']; // Standard header name for API keys

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API Key is missing' });
  }

  if (apiKey !== CHATBOT_API_KEY) {
    return res.status(403).json({ success: false, error: 'Invalid API Key' });
  }

  // API Key is valid, proceed to the next middleware or route handler
  next();
}; 