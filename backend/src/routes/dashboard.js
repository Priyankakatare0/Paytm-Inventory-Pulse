const express = require("express");
const router = express.Router();
const prisma = require("../db");

function clampNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, days) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function formatDayLabel(d) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function computeDaysLeft(quantity, dailyRate) {
  const q = clampNumber(quantity, 0);
  const rate = clampNumber(dailyRate, 0);
  if (rate <= 0) return Infinity;
  return q / rate;
}

// GET /api/dashboard/summary
// Returns aggregated stats used by dashboard widgets.
router.get("/summary", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) return res.status(401).json({ error: "Unauthorized" });

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);

    const weekStart = addDays(todayStart, -6); // last 7 days including today
    const weekEnd = tomorrowStart;

    // Transactions
    const [todayAgg, weekAgg, recentTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          merchantId: Number(merchantId),
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          merchantId: Number(merchantId),
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { merchantId: Number(merchantId) },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const todayRevenue = clampNumber(todayAgg?._sum?.amount, 0);
    const weekRevenue = clampNumber(weekAgg?._sum?.amount, 0);

    // Udhaar (today total)
    const todayUdhaarAgg = await prisma.udhaarEntry.aggregate({
      where: {
        merchantId: Number(merchantId),
        createdAt: { gte: todayStart, lt: tomorrowStart },
        status: "pending",
      },
      _sum: { amount: true },
    });
    const todayUdhaar = clampNumber(todayUdhaarAgg?._sum?.amount, 0);

    // Inventory (low stock)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { merchantId: Number(merchantId) },
      select: { id: true, quantity: true, dailyRate: true },
    });
    const lowStockCount = inventoryItems.reduce((acc, item) => {
      const daysLeft = computeDaysLeft(item.quantity, item.dailyRate);
      return acc + (daysLeft < 3 ? 1 : 0);
    }, 0);

    // Weekly series: revenue vs expenses (by transaction.type)
    // Assumption: type === "purchase" counts as expense, everything else counts as revenue.
    const txWeek = await prisma.transaction.findMany({
      where: {
        merchantId: Number(merchantId),
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      select: { amount: true, type: true, createdAt: true },
    });

    const dayBuckets = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      dayBuckets.push({
        date: startOfDay(day),
        label: formatDayLabel(day),
        revenue: 0,
        expenses: 0,
      });
    }

    for (const t of txWeek) {
      const dt = startOfDay(t.createdAt);
      const idx = Math.floor((dt - dayBuckets[0].date) / (1000 * 60 * 60 * 24));
      if (idx < 0 || idx > 6) continue;
      const amount = clampNumber(t.amount, 0);
      if (String(t.type).toLowerCase() === "purchase") {
        dayBuckets[idx].expenses += amount;
      } else {
        dayBuckets[idx].revenue += amount;
      }
    }

    // Payment split (last 7 days): by transaction.type (UPI/Cash/Card/etc)
    const split = new Map();
    for (const t of txWeek) {
      const key = String(t.type || "Unknown");
      split.set(key, (split.get(key) || 0) + clampNumber(t.amount, 0));
    }
    const paymentSplit = Array.from(split.entries())
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);

    return res.json({
      stats: {
        todayRevenue,
        todayUdhaar,
        lowStockCount,
        weekRevenue,
      },
      charts: {
        weeklyRevenueVsExpenses: dayBuckets.map(({ label, revenue, expenses }) => ({
          day: label,
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
        })),
        paymentSplit: paymentSplit.map((x) => ({
          type: x.type,
          amount: Math.round(x.amount),
        })),
      },
      recentPayments: recentTransactions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to load dashboard" });
  }
});

module.exports = router;
