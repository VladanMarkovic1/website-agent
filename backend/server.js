console.log("🚀 STARTING SERVER WITH ESSENTIAL ROUTES...");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Import essential routes
console.log("🔄 IMPORTING ESSENTIAL ROUTES...");
import registrationRoutes from "./routes/registrationRoutes.js";
console.log("✅ REGISTRATION ROUTES IMPORTED");
import loginRoutes from "./routes/loginRoutes.js";
console.log("✅ LOGIN ROUTES IMPORTED");
import adminRoutes from "./routes/adminRoutes.js";
console.log("✅ ADMIN ROUTES IMPORTED");
import scraperRoutes from "./routes/scraperRoutes.js";
console.log("✅ SCRAPER ROUTES IMPORTED");
import serviceRoutes from "./routes/serviceRoutes.js";
console.log("✅ SERVICE ROUTES IMPORTED");
import clientRoutes from './routes/clientRoutes.js';
console.log("✅ CLIENT ROUTES IMPORTED");

console.log("🔄 LOADING ENVIRONMENT...");
dotenv.config();
console.log("✅ ENVIRONMENT LOADED");

console.log("🔄 CREATING EXPRESS APP...");
const app = express();
console.log("✅ EXPRESS APP CREATED");

// Database connection
console.log("🔄 CONNECTING TO DATABASE...");
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("✅ DATABASE CONNECTED SUCCESSFULLY");
        })
        .catch((error) => {
            console.error("❌ DATABASE CONNECTION ERROR:", error.message);
        });
} else {
    console.error("❌ MONGODB_URI NOT SET");
}

console.log("🔄 SETTING UP MIDDLEWARE...");

// CORS Configuration (simplified)
const corsOptions = {
    origin: function (origin, callback) {
        // Allow all origins in development, specific ones in production
        if (!origin || process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            process.env.DASHBOARD_URL, 
            'https://chatbot-dashboard-nk7w.onrender.com',
            'http://localhost:5173',
            'http://localhost:3000'
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked:', origin);
            callback(null, true); // Allow anyway for now
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
console.log("✅ MIDDLEWARE SETUP");

// Health check
app.get('/health', (req, res) => {
    console.log("💗 HEALTH CHECK");
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    console.log("🧪 TEST ENDPOINT");
    res.json({ 
        message: 'Server working!', 
        timestamp: new Date().toISOString() 
    });
});

// Essential routes
console.log("🔄 SETTING UP ROUTES...");

// Auth routes (ESSENTIAL for login)
app.use("/api/v1/auth", registrationRoutes);
console.log("✅ REGISTRATION ROUTES ADDED");
app.use("/api/v1/auth", loginRoutes);
console.log("✅ LOGIN ROUTES ADDED");

// Dashboard routes (ESSENTIAL for dashboard)
app.use("/api/v1/admin", adminRoutes);
console.log("✅ ADMIN ROUTES ADDED");

// Business functionality routes
app.use("/api/v1/scraper", scraperRoutes);
console.log("✅ SCRAPER ROUTES ADDED");
app.use("/api/v1/services", serviceRoutes);
console.log("✅ SERVICE ROUTES ADDED");
app.use('/api/v1/clients', clientRoutes);
console.log("✅ CLIENT ROUTES ADDED");

// Error handling
app.use((err, req, res, next) => {
    console.error('🚨 EXPRESS ERROR:', err.message);
    res.status(500).json({ error: 'Server error' });
});

console.log("🔄 STARTING SERVER...");
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🎉 SERVER RUNNING ON PORT ${PORT}`);
    console.log("📋 Available endpoints:");
    console.log("   - GET /health");
    console.log("   - GET /test");
    console.log("   - POST /api/v1/auth/register");
    console.log("   - POST /api/v1/auth/login");
    console.log("   - GET /api/v1/admin/* (dashboard routes)");
    console.log("   - GET /api/v1/scraper/* (scraping routes)");
    console.log("✅ SERVER READY");
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION:', reason);
});

process.on('SIGTERM', () => {
    console.log('🚨 SIGTERM RECEIVED');
    server.close(() => {
        console.log('✅ SERVER CLOSED GRACEFULLY');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🚨 SIGINT RECEIVED');
    server.close(() => {
        console.log('✅ SERVER CLOSED GRACEFULLY');
        process.exit(0);
    });
});

console.log("✅ SERVER SETUP COMPLETE");
