const express = require("express");
const router = express.Router();

const prisma = require("../db");
const { getIO } = require("../services/socket");

function clampNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeDaysLeft(quantity, dailyRate) {
  const q = clampNumber(quantity, 0);
  const rate = clampNumber(dailyRate, 0);
  if (rate <= 0) return Infinity;
  return q / rate;
}

function computeLoanAmount(item, daysLeft) {
  // Same demo formula as inventory route: fund 7 days of stock for the gap.
  const dailyRate = clampNumber(item.dailyRate, 0);
  const price = clampNumber(item.price, 0);
  const targetDays = 7;
  const targetStock = dailyRate * targetDays;
  const gap = Math.max(0, targetStock - clampNumber(item.quantity, 0));
  const amount = gap * price;
  if (daysLeft >= 3) return 0;
  return Math.round(amount);
}

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

    // Emit low_stock so the frontend can show an automatic loan offer
    try {
      const daysLeft = computeDaysLeft(updated.quantity, updated.dailyRate);
      if (daysLeft < 3) {
        getIO().emit("low_stock", {
          item: updated,
          daysLeft,
          loanAmount: computeLoanAmount(updated, daysLeft),
        });
      }
    } catch (_) {
      // ignore
    }

    return res.json({ message: "Stock depleted", item: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to deplete stock" });
  }
});

module.exports = router;
