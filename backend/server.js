console.log("🚀 STARTING MINIMAL SERVER FOR TESTING...");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

console.log("🔄 LOADING ENVIRONMENT VARIABLES...");
dotenv.config();
console.log("✅ ENVIRONMENT VARIABLES LOADED");

console.log("🔄 CREATING EXPRESS APP...");
const app = express();
console.log("✅ EXPRESS APP CREATED");

// Basic middleware
console.log("🔄 SETTING UP MIDDLEWARE...");
app.use(cors());
app.use(express.json());
console.log("✅ MIDDLEWARE SETUP COMPLETE");

// Database connection
console.log("🔄 CONNECTING TO DATABASE...");
const MONGODB_URI = process.env.MONGODB_URI;
console.log("📋 MONGODB_URI:", MONGODB_URI ? 'SET' : 'NOT SET');

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

// Import and use scraper routes
console.log("🔄 IMPORTING SCRAPER ROUTES...");
import scraperRoutes from "./routes/scraperRoutes.js";
console.log("✅ SCRAPER ROUTES IMPORTED");

console.log("🔄 SETTING UP SCRAPER ROUTES...");
app.use("/api/scrape", scraperRoutes);
console.log("✅ SCRAPER ROUTES SETUP COMPLETE");

// Health check
app.get('/health', (req, res) => {
    console.log("💗 HEALTH CHECK REQUEST RECEIVED");
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
    console.log("💗 HEALTH CHECK RESPONSE SENT");
});

// Simple test route
app.get('/test', (req, res) => {
    console.log("🧪 TEST ROUTE CALLED");
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
    console.log("🧪 TEST RESPONSE SENT");
});

// Test Playwright import
app.get('/test-playwright', async (req, res) => {
    console.log("🎭 TESTING PLAYWRIGHT IMPORT...");
    try {
        console.log("🔄 IMPORTING PLAYWRIGHT MODULE...");
        const { chromium } = await import('playwright');
        console.log("✅ PLAYWRIGHT IMPORTED SUCCESSFULLY");
        
        console.log("🔄 LAUNCHING CHROMIUM BROWSER...");
        const browser = await chromium.launch({ 
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        console.log("✅ CHROMIUM LAUNCHED SUCCESSFULLY");
        
        console.log("🔄 CLOSING BROWSER...");
        await browser.close();
        console.log("✅ CHROMIUM CLOSED SUCCESSFULLY");
        
        console.log("🎉 PLAYWRIGHT TEST COMPLETED SUCCESSFULLY");
        res.json({ success: true, message: 'Playwright working!' });
    } catch (error) {
        console.error("❌ PLAYWRIGHT ERROR:", error.message);
        console.error("❌ PLAYWRIGHT STACK:", error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Database connection test
app.get('/test-db', async (req, res) => {
    console.log("🗄️ TESTING DATABASE CONNECTION...");
    try {
        console.log("🔄 CHECKING MONGOOSE CONNECTION STATE...");
        const connectionState = mongoose.connection.readyState;
        console.log("📋 CONNECTION STATE:", connectionState);
        
        if (connectionState !== 1) {
            throw new Error(`Database not connected. State: ${connectionState}`);
        }
        
        console.log("✅ DATABASE CONNECTION CONFIRMED");
        res.json({ success: true, message: 'Database connection working!', state: connectionState });
    } catch (error) {
        console.error("❌ DATABASE ERROR:", error.message);
        console.error("❌ DATABASE STACK:", error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Simple scraping test WITHOUT authentication (for testing only)
app.get('/test-scrape-simple/:businessId', async (req, res) => {
    console.log("🚀 SIMPLE SCRAPING TEST ROUTE CALLED (NO AUTH)");
    console.log("📋 REQUEST PARAMS:", req.params);
    
    const { businessId } = req.params;
    console.log("🔍 BUSINESS ID:", businessId);
    
    try {
        console.log("🔄 IMPORTING SCRAPER CONTROLLER...");
        const { scrapeBusiness } = await import('./scraper/scraperController.js');
        console.log("✅ SCRAPER CONTROLLER IMPORTED");
        
        // Create a mock request object
        const mockReq = {
            params: { businessId },
            body: {},
            headers: req.headers
        };
        
        console.log("🔄 CALLING SCRAPER CONTROLLER WITH MOCK REQUEST...");
        await scrapeBusiness(mockReq, res);
        console.log("✅ SCRAPER CONTROLLER COMPLETED");
        
    } catch (error) {
        console.error("🚨 SIMPLE SCRAPING TEST ERROR:", error.message);
        console.error("🚨 SIMPLE SCRAPING TEST STACK:", error.stack);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

console.log("🔄 STARTING SERVER...");
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🎉 MINIMAL SERVER RUNNING ON PORT ${PORT}`);
    console.log("🌐 Available endpoints:");
    console.log(`   - GET /health`);
    console.log(`   - GET /test`);
    console.log(`   - GET /test-playwright`);
    console.log(`   - GET /test-db`);
    console.log(`   - GET /test-scrape-simple/:businessId (NO AUTH)`);
    console.log(`   - GET /api/scrape/:businessId (WITH AUTH)`);
});

console.log("✅ MINIMAL SERVER SETUP COMPLETE");
