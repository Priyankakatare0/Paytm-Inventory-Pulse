const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventory');
const { getIO } = require('../services/socket');

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
  // Simple demo formula: fund 7 days of stock for the gap.
  const dailyRate = clampNumber(item.dailyRate, 0);
  const price = clampNumber(item.price, 0);
  const targetDays = 7;
  const targetStock = dailyRate * targetDays;
  const gap = Math.max(0, targetStock - clampNumber(item.quantity, 0));
  const amount = gap * price;

  // If daysLeft is already healthy, loan suggestion is 0.
  if (daysLeft >= 3) return 0;
  return Math.round(amount);
}

function slugifySkuPart(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 18);
}

async function generateUniqueSku({ merchantId, name }) {
  const base = slugifySkuPart(name) || "ITEM";
  // Add short suffix to avoid collisions (sku is globally unique).
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${base}-${suffix}`;
    const existing = await inventoryService.getInventoryItemBySku(candidate);
    if (!existing) return candidate;
  }
  // Last resort
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/inventory - list items for merchant
router.get('/', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const items = await inventoryService.listInventory(merchantId);
    const enriched = items.map((item) => {
      const daysLeft = computeDaysLeft(item.quantity, item.dailyRate);
      return {
        ...item,
        depletion_rate: item.dailyRate,
        daily_rate: item.dailyRate,
        daysLeft,
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const item = await inventoryService.getInventoryItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.merchantId !== Number(merchantId)) return res.status(403).json({ error: 'Forbidden' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory
router.post('/', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, sku, quantity, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const finalSku = sku ? String(sku) : await generateUniqueSku({ merchantId, name });
    const item = await inventoryService.createInventoryItem({
      name,
      sku: finalSku,
      quantity: Number(quantity),
      price: Number(price),
      merchantId,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/inventory/sale — decrement stock
// Body: { sku: "SKU123", quantity: 1 } OR { id: 1, quantity: 1 }
router.post('/sale', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const { sku, id, quantity } = req.body;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }

    let item;
    if (id) {
      item = await inventoryService.getInventoryItem(id);
    } else if (sku) {
      item = await inventoryService.getInventoryItemBySku(sku);
    } else {
      return res.status(400).json({ error: 'Provide either id or sku' });
    }

    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.merchantId !== Number(merchantId)) return res.status(403).json({ error: 'Forbidden' });

    const newQty = item.quantity - qty;
    if (newQty < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const updated = await inventoryService.updateInventoryItem(item.id, { quantity: newQty });

    const daysLeft = computeDaysLeft(updated.quantity, updated.dailyRate);
    if (daysLeft < 3) {
      const payload = {
        item: updated,
        daysLeft,
        loanAmount: computeLoanAmount(updated, daysLeft),
      };

      try {
        const io = getIO();
        io.emit('low_stock', payload);
      } catch (_) {
        // Socket not initialized — ignore
      }
    }

    return res.json({ message: 'Stock decremented', item: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const existing = await inventoryService.getInventoryItem(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.merchantId !== Number(merchantId)) return res.status(403).json({ error: 'Forbidden' });
    const data = req.body;
    const updated = await inventoryService.updateInventoryItem(id, data);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const existing = await inventoryService.getInventoryItem(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.merchantId !== Number(merchantId)) return res.status(403).json({ error: 'Forbidden' });
    await inventoryService.deleteInventoryItem(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
