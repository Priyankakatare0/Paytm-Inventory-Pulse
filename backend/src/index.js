require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { initSocket } = require("./services/socket");
const { startReminderCron } = require("./services/reminders");

const authRoutes = require("./routes/auth");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const udhaarRoutes = require("./routes/udhaar");
const webhookRoutes = require("./routes/webhook"); // Import webhook routes
const demoRoutes = require("./routes/demo");
const dashboardRoutes = require("./routes/dashboard");
const { authenticate } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

function logDbTarget() {
  try {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      console.log("🗄️ DATABASE_URL not set");
      return;
    }
    const u = new URL(raw);
    const safe = {
      host: u.hostname,
      port: u.port,
      db: u.pathname,
      sslmode: u.searchParams.get("sslmode"),
      pgbouncer: u.searchParams.get("pgbouncer"),
      statement_cache_size: u.searchParams.get("statement_cache_size"),
    };
    console.log("🗄️ DB target:", safe);
  } catch {
    console.log("🗄️ DATABASE_URL is set (unable to parse)");
  }
}

// Initialize Socket.io
const io = initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.get("/", (req, res) => {
  res.json({ message: "Paytm Inventory Backend is running" });
});

app.use("/api/auth", authRoutes);

// All routes below this will be protected
app.use(authenticate);

app.use("/api/webhook", webhookRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/udhaar", udhaarRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Protected route example
app.get("/api/protected", (req, res) => {
  res.json({
    message: "This is a protected route",
    merchant: req.merchant,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔑 Login at POST http://localhost:${PORT}/api/auth/login`);

  logDbTarget();

	startReminderCron();
	console.log("⏰ Reminder cron started");
});

