import express from 'express';
import cors from 'cors';
import chatbotRoutes from './routes/chatbotRoutes.js';
import testRoutes from './routes/testRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/test', testRoutes);

// Basic health check route
app.get('/', (req, res) => {
    res.json({ message: 'Dental Website API is running' });
});

export default app; 