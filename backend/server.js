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
        origin: 'http://localhost:5173', // Your frontend URL
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: false
    }));

    // Rate limiting middleware
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again after 15 minutes'
    });

    const authLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // Limit each IP to 5 login/register attempts per hour
        message: 'Too many authentication attempts from this IP, please try again after an hour'
    });

    const adminLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 30, // Limit each IP to 30 requests per hour for admin routes
        message: 'Too many admin requests from this IP, please try again after an hour'
    });

    // Apply general rate limiting to all routes
    app.use(generalLimiter);

    app.use(express.json());

    // Routes with specific rate limits
    app.use("/scraper", generalLimiter, scraperRoutes);
    app.use("/services", generalLimiter, serviceRoutes);
    app.use("/chatbot", generalLimiter, chatbotRoutes);
    app.use('/leads', generalLimiter, leadRoutes);
    app.use("/admin", adminLimiter, adminRoutes);           // Admin endpoints with stricter limits
    app.use("/", authLimiter, registrationRoutes);         // Registration endpoint with auth limits
    app.use("/", authLimiter, loginRoutes);                // Login endpoint with auth limits

    // Initialize WebSocket Chat
    initWebSocket(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
