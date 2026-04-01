require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { initSocket } = require("./services/socket");

const authRoutes = require("./routes/auth");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const udhaarRoutes = require("./routes/udhaar");
const demoRoutes = require("./routes/demo");
const webhookRoutes = require("./routes/webhook"); // Import webhook routes
const { authenticate } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/webhook", webhookRoutes); 

// All routes below this will be protected
app.use(authenticate);

app.use("/api/inventory", inventoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/udhaar", udhaarRoutes);
app.use("/api/demo", demoRoutes);

// Protected route example
app.get("/api/protected", (req, res) => {
  res.json({
    message: "This is a protected route",
    merchant: req.merchant,
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Paytm Inventory Backend is running" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔑 Login at POST http://localhost:${PORT}/api/auth/login`);
});

