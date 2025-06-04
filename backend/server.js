import express from "express";
console.log("✅ EXPRESS IMPORTED");
import dotenv from "dotenv";
console.log("✅ DOTENV IMPORTED");
import cors from "cors";
console.log("✅ CORS IMPORTED");
import helmet from "helmet";
console.log("✅ HELMET IMPORTED");
import http from "http";
console.log("✅ HTTP IMPORTED");
import { Server } from "socket.io";
console.log("✅ SOCKET.IO IMPORTED");
import rateLimit from 'express-rate-limit';
console.log("✅ RATE LIMIT IMPORTED");

console.log("🔄 ATTEMPTING TO IMPORT CONFIG FILES...");
import connectDB from "./config/db.js";
console.log("✅ DB CONFIG IMPORTED");
import initWebSocket from "./config/websocket.js";
console.log("✅ WEBSOCKET CONFIG IMPORTED");

console.log("🔄 ATTEMPTING TO IMPORT ROUTE FILES...");
import scraperRoutes from "./routes/scraperRoutes.js";
console.log("✅ SCRAPER ROUTES IMPORTED");
import serviceRoutes from "./routes/serviceRoutes.js";
console.log("✅ SERVICE ROUTES IMPORTED");
import chatbotRoutes from "./routes/chatbotRoutes.js";
console.log("✅ CHATBOT ROUTES IMPORTED");
import adminRoutes from "./routes/adminRoutes.js";
console.log("✅ ADMIN ROUTES IMPORTED");
import registrationRoutes from "./routes/registrationRoutes.js";
console.log("✅ REGISTRATION ROUTES IMPORTED");
import loginRoutes from "./routes/loginRoutes.js";
console.log("✅ LOGIN ROUTES IMPORTED");
import leadRoutes from "./routes/leadRoutes.js";
console.log("✅ LEAD ROUTES IMPORTED");
import analyticsRoutes from './routes/analyticsRoutes.js';
console.log("✅ ANALYTICS ROUTES IMPORTED");
import clientRoutes from './routes/clientRoutes.js';
console.log("✅ CLIENT ROUTES IMPORTED");

console.log("🔄 ATTEMPTING TO IMPORT MODELS...");
import Business from './models/Business.js';
console.log("✅ BUSINESS MODEL IMPORTED");

console.log("🔄 CONFIGURING DOTENV...");
dotenv.config();
console.log("✅ DOTENV CONFIGURED");

// Add process error handlers to prevent crashes
console.log("🔄 SETTING UP ERROR HANDLERS...");
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    console.error('🚨 STACK:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log("✅ ERROR HANDLERS SET UP");

const startServer = async () => {
    try {
        console.log("🚀 STARTING SERVER...");
        
        console.log("🔄 CONNECTING TO DATABASE...");
        await connectDB();
        console.log("✅ DATABASE CONNECTED");

        console.log("🔄 CREATING EXPRESS APP...");
        const app = express();
        console.log("✅ EXPRESS APP CREATED");
        
        console.log("🔄 CREATING HTTP SERVER...");
        const server = http.createServer(app);
        console.log("✅ HTTP SERVER CREATED");
        
        console.log("🔄 CREATING SOCKET.IO SERVER...");
        const io = new Server(server, {
            cors: { origin: "*", methods: ["GET", "POST"] },
            transports: ["websocket", "polling"],
        });
        console.log("✅ SOCKET.IO SERVER CREATED");

        console.log("🔄 SETTING UP MIDDLEWARE...");
        app.set('trust proxy', 1);
        console.log("✅ TRUST PROXY SET");

        app.use(helmet());
        console.log("✅ HELMET MIDDLEWARE ADDED");
        
        // CORS Configuration
        console.log("🔄 SETTING UP CORS...");
        const whitelist = [
            process.env.DASHBOARD_URL, 
            process.env.WIDGET_TEST_SITE_URL,
            process.env.WIDGET_DENTIST_SITE_URL,
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            'https://*.vercel.app',
            'https://*.render.com',
            'https://*.squarespace.com',
            'https://lynx-clarinet-xph4.squarespace.com'
        ].filter(Boolean);
        console.log("✅ CORS WHITELIST CREATED");

        const corsOptions = {
            origin: function (origin, callback) {
                if (!origin) {
                    return callback(null, true);
                }
                
                const isAllowed = whitelist.some(allowedOrigin => {
                    if (allowedOrigin.includes('*')) {
                        const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
                        return pattern.test(origin);
                    }
                    return allowedOrigin === origin;
                });

                if (isAllowed) {
                    callback(null, true);
                } else {
                    console.log('CORS blocked request from origin:', origin);
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
        console.log("✅ CORS MIDDLEWARE ADDED");

        app.use(express.json());
        console.log("✅ JSON MIDDLEWARE ADDED");

        // Rate limiting middleware
        console.log("🔄 SETTING UP RATE LIMITERS...");
        const generalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Too many requests from this IP, please try again after 15 minutes'
        });
        console.log("✅ GENERAL LIMITER CREATED");

        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 20,
            message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
        });
        console.log("✅ AUTH LIMITER CREATED");

        const adminLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 50,
            message: 'Too many admin requests from this IP, please try again after 15 minutes'
        });
        console.log("✅ ADMIN LIMITER CREATED");

        // Auth routes first
        console.log("🔄 SETTING UP ROUTES...");
        app.use("/api/v1/auth", authLimiter, registrationRoutes);
        console.log("✅ REGISTRATION ROUTES ADDED");
        app.use("/api/v1/auth", authLimiter, loginRoutes);
        console.log("✅ LOGIN ROUTES ADDED");

        app.use(generalLimiter);
        console.log("✅ GENERAL LIMITER APPLIED");

        // API Routes
        app.use("/api/v1/scraper", scraperRoutes);
        console.log("✅ SCRAPER ROUTES ADDED");
        app.use("/api/v1/services", serviceRoutes);
        console.log("✅ SERVICE ROUTES ADDED");
        app.use("/api/v1/chatbot", chatbotRoutes);
        console.log("✅ CHATBOT ROUTES ADDED");
        app.use('/api/v1/leads', leadRoutes);
        console.log("✅ LEAD ROUTES ADDED");
        app.use("/api/v1/admin", adminLimiter, adminRoutes);
        console.log("✅ ADMIN ROUTES ADDED");
        app.use('/api/v1/analytics', analyticsRoutes);
        console.log("✅ ANALYTICS ROUTES ADDED");
        app.use('/api/v1/clients', clientRoutes);
        console.log("✅ CLIENT ROUTES ADDED");

        // Initialize WebSocket Chat
        console.log("🔄 INITIALIZING WEBSOCKET...");
        initWebSocket(io);
        console.log("✅ WEBSOCKET INITIALIZED");

        // Add error handling middleware
        console.log("🔄 ADDING ERROR MIDDLEWARE...");
        app.use((err, req, res, next) => {
            console.error('🚨 SERVER ERROR:', err);
            res.status(err.status || 500).json({
                error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
            });
        });
        console.log("✅ ERROR MIDDLEWARE ADDED");

        console.log("🔄 STARTING SERVER LISTENER...");
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🎉 SERVER SUCCESSFULLY RUNNING ON PORT ${PORT}`);
            console.log("🎉 ALL SYSTEMS GO!");
        });
        console.log("✅ SERVER LISTEN CALLED");
        
    } catch (error) {
        console.error('🚨 FAILED TO START SERVER:', error);
        console.error('🚨 ERROR STACK:', error.stack);
    }
};

console.log("🔄 CALLING START SERVER...");
startServer().catch(error => {
    console.error('🚨 SERVER STARTUP ERROR:', error);
    console.error('🚨 ERROR STACK:', error.stack);
});
