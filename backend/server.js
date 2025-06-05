console.log("🚀 STARTING FULL SERVER WITH ALL ROUTES...");

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import rateLimit from 'express-rate-limit';

console.log("🔄 IMPORTING CONFIG FILES...");
import connectDB from "./config/db.js";
import initWebSocket from "./config/websocket.js";

console.log("🔄 IMPORTING ALL ROUTE FILES...");
import scraperRoutes from "./routes/scraperRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import analyticsRoutes from './routes/analyticsRoutes.js';
import clientRoutes from './routes/clientRoutes.js';

console.log("🔄 CONFIGURING DOTENV...");
dotenv.config();

// Add process monitoring
let isShuttingDown = false;

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
        
        app.use(helmet());
        
        // CORS Configuration
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
        app.use(express.json());

        // Rate limiting middleware
        const generalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Too many requests from this IP, please try again after 15 minutes'
        });

        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 20,
            message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
        });

        const adminLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 50,
            message: 'Too many admin requests from this IP, please try again after 15 minutes'
        });

        // Health check route
        app.get('/health', (req, res) => {
            console.log("💗 HEALTH CHECK REQUEST RECEIVED");
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                isShuttingDown 
            });
        });
        
        // Auth routes first
        app.use("/api/v1/auth", authLimiter, registrationRoutes);
        app.use("/api/v1/auth", authLimiter, loginRoutes);

        app.use(generalLimiter);

        // ALL API Routes
        app.use("/api/v1/scraper", scraperRoutes);
        app.use("/api/v1/services", serviceRoutes);
        app.use("/api/v1/chatbot", chatbotRoutes);
        app.use('/api/v1/leads', leadRoutes);
        app.use("/api/v1/admin", adminLimiter, adminRoutes);
        app.use('/api/v1/analytics', analyticsRoutes);
        app.use('/api/v1/clients', clientRoutes);

        // Initialize WebSocket
        console.log("🔄 INITIALIZING WEBSOCKET...");
        initWebSocket(io);
        console.log("✅ WEBSOCKET INITIALIZED");

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('🚨 SERVER ERROR:', err);
            res.status(err.status || 500).json({
                error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
            });
        });

        const PORT = process.env.PORT || 5000;
        
        // SIGTERM handler BEFORE starting server
        process.on('SIGTERM', () => {
            console.log('🚨 SIGTERM RECEIVED - STARTING GRACEFUL SHUTDOWN');
            isShuttingDown = true;
            
            server.close((err) => {
                if (err) {
                    console.error('❌ ERROR DURING SERVER SHUTDOWN:', err);
                    process.exit(1);
                }
                console.log('✅ SERVER CLOSED GRACEFULLY');
                process.exit(0);
            });
            
            // Force exit after 10 seconds
            setTimeout(() => {
                console.error('🚨 FORCE EXIT - SHUTDOWN TIMEOUT');
                process.exit(1);
            }, 10000);
        });

        server.listen(PORT, () => {
            console.log(`🎉 SERVER SUCCESSFULLY RUNNING ON PORT ${PORT}`);
            console.log("🎉 ALL SYSTEMS GO!");
            console.log("📋 Memory usage:", process.memoryUsage());
        });
        
        // Keep the process alive and monitor memory
        setInterval(() => {
            const memUsage = process.memoryUsage();
            console.log(`📊 Memory: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB`);
            
            // If memory is too high, log warning
            if (memUsage.rss > 500 * 1024 * 1024) { // 500MB
                console.warn('⚠️ HIGH MEMORY USAGE:', memUsage);
            }
        }, 30000); // Every 30 seconds
        
    } catch (error) {
        console.error('🚨 FAILED TO START SERVER:', error);
        console.error('🚨 ERROR STACK:', error.stack);
        process.exit(1);
    }
};

// Error handlers
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    console.error('🚨 STACK:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log("🔄 CALLING START SERVER...");
startServer();
