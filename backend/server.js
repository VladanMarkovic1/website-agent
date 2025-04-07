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
    
    // Configure CORS
    app.use(cors({
        origin: true, // Allow all origins in development
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
        credentials: true
    }));

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
    app.use("/auth", authLimiter, registrationRoutes);      // Registration endpoint with auth limits
    app.use("/auth", authLimiter, loginRoutes);            // Login endpoint with auth limits

    // Then apply general rate limiting to other routes
    app.use(generalLimiter);

    // Routes with specific rate limits
    app.use("/scraper", scraperRoutes);
    app.use("/services", serviceRoutes);
    app.use("/chatbot", chatbotRoutes);
    app.use('/leads', leadRoutes);
    app.use("/admin", adminLimiter, adminRoutes);           // Admin endpoints with stricter limits

    // Analytics routes
    app.use('/analytics', analyticsRoutes);

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
