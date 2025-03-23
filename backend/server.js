import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import initWebSocket from "./config/websocket.js";
import scraperRoutes from "./routes/scraperRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js"; // ✅ Chatbot routes added
import registrationRoutes from "./routes/registrationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const startServer = async () => {
    await connectDB(); // ✅ Ensure MongoDB is connected

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ["websocket", "polling"], // ✅ Allow WebSocket
    });

    // ✅ Middleware
    app.use(cors());
    app.use(express.json());

    // ✅ Routes
    app.use("/scraper", scraperRoutes);
    app.use("/api/services", serviceRoutes);
    app.use("/api/chatbot", chatbotRoutes);
    app.use("/admin", adminRoutes);           // Mount admin routes
    app.use("/", registrationRoutes);           // Mount registration route
    // ✅ Initialize WebSocket Chat
    initWebSocket(io);

    // ✅ Start Server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
};

startServer();
