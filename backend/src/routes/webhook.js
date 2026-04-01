const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { getIO } = require("../services/socket");

// Mock Paytm webhook
router.post("/paytm", async (req, res) => {
  try {
    const { amount, type, merchant_id } = req.body;

    if (amount == null || !type || merchant_id == null) {
      return res.status(400).json({ error: "amount, type, and merchant_id are required" });
    }

    // 1. Save transaction to DB
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type: type,
        merchantId: parseInt(merchant_id),
        description: "Payment received via Paytm",
      },
    });

    // 2. Emit a socket event
    const io = getIO();
    io.emit("new_payment", transaction);

    console.log("New payment processed and event emitted:", transaction);

    res.status(200).json({ message: "Payment processed successfully", transaction });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
});

// Manual trigger for judges
router.post("/trigger-payment", async (req, res) => {
  try {
    const { amount = 50, type = "UPI", merchant_id = 1 } = req.body;

    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type: type,
        merchantId: parseInt(merchant_id),
        description: "Manual payment trigger",
      },
    });

    const io = getIO();
    io.emit("new_payment", transaction);

    console.log("Manual payment triggered and event emitted:", transaction);

    res.status(200).json({ message: "Manual payment triggered successfully", transaction });
  } catch (error) {
    console.error("Error triggering payment:", error);
    res.status(500).json({ error: "Failed to trigger payment" });
  }
});

module.exports = router;
