const initWebSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 A user connected: ${socket.id}`);

        // Send a message to the client upon successful connection
        socket.emit("message", "Welcome to the WebSocket server!");

        // Listen for messages from clients
        socket.on("message", (data) => {
            console.log(`📩 Received message: ${data}`);
            io.emit("message", `Server received: ${data}`);
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });

    console.log('✅ WebSocket server is running');
};

export default initWebSocket;
