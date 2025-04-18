import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import rateLimit from 'express-rate-limit';
import connectDB from "./config/db.js";
import initWebSocket from "./config/websocket.js";
import scraperRoutes from "./routes/scraperRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import analyticsRoutes from './routes/analyticsRoutes.js';
import clientRoutes from './routes/clientRoutes.js'; // Import the new client routes
import Business from './models/Business.js'; // Import Business model

dotenv.config();

const startServer = async () => {
    await connectDB(); // Ensure MongoDB is connected

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ["websocket", "polling"],
    });

    // Security middleware
    app.use(helmet()); // Set secure HTTP headers
    
    // --- Dynamic CORS Configuration ---
    // Define allowed origins logic
    const corsOptions = {
      origin: async (origin, callback) => {
        if (!origin) {
          // Allow requests with no origin (like mobile apps, curl, server-to-server)
          // In production, you might want to be stricter depending on use case
          return callback(null, true);
        }
        try {
          // Fetch all active businesses and their allowed origins
          const businesses = await Business.find({ isActive: true }, 'allowedOrigins').lean(); // Assuming an isActive flag
          const allowedOrigins = businesses.flatMap(b => b.allowedOrigins || []);
          // Also allow your dashboard domain(s) - get from ENV or hardcode
          const dashboardOrigin = process.env.DASHBOARD_URL; // e.g., 'https://your-dashboard.com'
          if (dashboardOrigin) {
            allowedOrigins.push(dashboardOrigin);
          }
          // Add localhost for development testing if needed
          if (process.env.NODE_ENV === 'development') {
             allowedOrigins.push('http://localhost:5173'); // Example Vite default port for chatbot testing
             allowedOrigins.push('http://localhost:5174'); // Example Vite default port for dashboard testing
          }

          if (allowedOrigins.includes(origin)) {
            callback(null, true); // Origin is allowed
          } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS')); // Origin is not allowed
          }
        } catch (error) {
          console.error("Error in CORS origin check:", error);
          callback(new Error('CORS check failed due to internal error')); // Internal error
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'], // Simplify headers if possible
      credentials: true
    };

    // Apply CORS middleware
    app.use(cors(corsOptions));
    // Handle preflight requests for all routes
    app.options('*', cors(corsOptions)); 
    // --- End Dynamic CORS Configuration ---

    app.use(express.json());

    // Rate limiting middleware
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again after 15 minutes'
    });

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // Increased from 5 to 20 attempts per 15 minutes
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    });

    const adminLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // Increased from 30 to 50 requests per 15 minutes
        message: 'Too many admin requests from this IP, please try again after 15 minutes'
    });

    // Auth routes first (without general rate limiting)
    app.use("/api/v1/auth", authLimiter, registrationRoutes);
    app.use("/api/v1/auth", authLimiter, loginRoutes);

    // Then apply general rate limiting to other routes
    app.use(generalLimiter);

    // API Routes
    app.use("/api/v1/scraper", scraperRoutes);
    app.use("/api/v1/services", serviceRoutes);
    app.use("/api/v1/chatbot", chatbotRoutes);
    app.use('/api/v1/leads', leadRoutes);
    app.use("/api/v1/admin", adminLimiter, adminRoutes);           // Admin endpoints with stricter limits
    app.use('/api/v1/analytics', analyticsRoutes);
    app.use('/api/v1/clients', clientRoutes); // Mount the client management routes

    // Initialize WebSocket Chat
    initWebSocket(io);

    // Add error handling middleware
    app.use((err, req, res, next) => {
        console.error('Server Error:', err);
        res.status(err.status || 500).json({
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
