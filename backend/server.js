import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
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
    app.use(cors());   // Configure CORS as needed
    app.use(express.json());

    // Routes
    app.use("/scraper", scraperRoutes);
    app.use("/api/services", serviceRoutes);
    app.use("/api/chatbot", chatbotRoutes);
    app.use('/leads', leadRoutes);
    app.use("/admin", adminRoutes);           // Admin endpoints
    app.use("/", registrationRoutes);           // Registration endpoint
    app.use("/", loginRoutes);                  // Login endpoint

    // Initialize WebSocket Chat
    initWebSocket(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
