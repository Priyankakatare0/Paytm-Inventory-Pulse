const express = require("express");
const router = express.Router();

const prisma = require("../db");
const { getIO } = require("../services/socket");

// POST /api/demo/fire-payment
// Creates a fake payment transaction and emits Socket.io event: "new_payment"
router.post("/fire-payment", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { amount = 600, type = "UPI", description = "Demo payment" } = req.body || {};

    const transaction = await prisma.transaction.create({
      data: {
        amount: Number(amount),
        type: String(type),
        merchantId: Number(merchantId),
        description: String(description),
      },
    });

    // Emit live update
    try {
      const io = getIO();
      io.emit("new_payment", transaction);
    } catch (_) {
      // Socket not initialized / no clients connected — still ok for demo
    }

    return res.json({ message: "Demo payment fired", transaction });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fire payment" });
  }
});

// POST /api/demo/deplete-stock
// Reduces an item quantity to a low number so the UI can trigger a loan card.
// Body: { sku: "SKU123" } OR { id: 1 } Optional: { remaining: 0 }
router.post("/deplete-stock", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sku, id, remaining = 0 } = req.body || {};

    if (!sku && !id) {
      return res.status(400).json({ error: "Provide either sku or id" });
    }

    const where = id
      ? { id: Number(id), merchantId: Number(merchantId) }
      : { sku: String(sku), merchantId: Number(merchantId) };

    const item = await prisma.inventoryItem.findFirst({ where });
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: Number(remaining) },
    });

    return res.json({ message: "Stock depleted", item: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to deplete stock" });
  }
});

module.exports = router;
