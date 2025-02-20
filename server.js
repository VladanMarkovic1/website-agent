import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import initWebSocket from './config/websocket.js';
import testRoutes from './routes/testRoutes.js';
import testSchemaRoutes from "./routes/testSchemaRoutes.js";
import scraperRoutes from "./routes/scraperRoutes.js";

dotenv.config();

const startServer = async () => {
    await connectDB(); // Ensure DB is connected first

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ["websocket", "polling"], // Allow raw WebSockets
    });
    

    app.use(cors());
    app.use(express.json());
    app.use('/test', testRoutes);
    app.use("/test-schema", testSchemaRoutes);
    app.use("/scraper", scraperRoutes);

    initWebSocket(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();
