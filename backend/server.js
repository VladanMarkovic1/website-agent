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

    // Trust the first proxy hop (Render's reverse proxy)
    app.set('trust proxy', 1); 

    // Security middleware
    app.use(helmet()); // Set secure HTTP headers
    
    // CORS Configuration
    const whitelist = [
        process.env.DASHBOARD_URL, 
        process.env.WIDGET_TEST_SITE_URL,
        process.env.WIDGET_DENTIST_SITE_URL,
        'http://localhost:5173', // Vite default for dashboard dev
        'http://localhost:5174', // Vite default for widget dev
        'http://localhost:5175', // Vite default for chatbot dev
        'http://localhost:3000', // Common React development port
        'http://127.0.0.1:5173', // Alternative localhost format
        'http://127.0.0.1:3000', // Alternative localhost format
        'https://*.vercel.app',  // Allow all Vercel deployments
        'https://*.render.com',  // Allow all Render deployments
        'https://*.squarespace.com', // Allow all Squarespace domains
        'https://lynx-clarinet-xph4.squarespace.com' // Specific Squarespace domain
    ].filter(Boolean); // Filter out undefined values if env vars are not set

    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                return callback(null, true);
            }
            
            // Check if the origin matches any of the whitelist patterns
            const isAllowed = whitelist.some(allowedOrigin => {
                if (allowedOrigin.includes('*')) {
                    // Handle wildcard domains
                    const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
                    return pattern.test(origin);
                }
                return allowedOrigin === origin;
            });

            if (isAllowed) {
                callback(null, true);
            } else {
                console.log('CORS blocked request from origin:', origin);
                // For development, you might want to allow all origins
                if (process.env.NODE_ENV === 'development') {
                    console.log('Development mode: allowing all origins');
                    return callback(null, true);
                }
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
    };
    app.use(cors(corsOptions));

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
